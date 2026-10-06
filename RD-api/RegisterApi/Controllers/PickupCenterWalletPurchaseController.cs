using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using RegisterApi.Data;
using RegisterApi.Models;

namespace RegisterApi.Controllers
{
    public class WalletPurchaseItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class WalletPurchaseDto
    {
        public List<WalletPurchaseItemDto> Items { get; set; } = new();
    }

    // "Buy from Company" paid from the pickup center's wallet — WITH admin approval.
    // In ONE database transaction this
    //   1. debits the wallet immediately (+ writes a Debit transaction row)
    //   2. creates the order as Pending (UtrNumber starts with "WALLET-")
    // Nothing is touched in company stock or the center's inventory yet.
    //   Admin ACCEPTS -> company stock is deducted, units go to the center's inventory
    //                    (see AdminPickupCenterController.UpdateOrderStatus)
    //   Admin REJECTS -> the debited amount is refunded to the wallet (Credit row),
    //                    no stock moves.
    // Prices / discount / first-order minimum mirror PickupCenterController.SubmitOrder.
    [ApiController]
    [Route("api/PickupCenter")]
    [Authorize(Roles = "PickupCenter")]
    public class PickupCenterWalletPurchaseController : ControllerBase
    {
        private const decimal MinOrderDp = 15000m;        // first order only
        private const decimal DiscountPercent = 6m;

        private static readonly SemaphoreSlim _lock = new(1, 1);
        private readonly AppDbContext _db;

        public PickupCenterWalletPurchaseController(AppDbContext db) => _db = db;

        private string CurrentPucId =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("PucId claim missing from token.");

        // POST /api/PickupCenter/orders/wallet   { items: [{ productId, quantity }] }
        [HttpPost("orders/wallet")]
        public async Task<IActionResult> PayWithWallet([FromBody] WalletPurchaseDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Your cart is empty." });
            if (dto.Items.Any(i => i.Quantity <= 0))
                return BadRequest(new { message = "Item quantity must be at least 1." });

            // merge duplicate product lines
            var wanted = dto.Items.GroupBy(i => i.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            await _lock.WaitAsync();
            try
            {
                var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
                if (center == null) return NotFound(new { message = "Pickup center not found." });

                var productIds = wanted.Keys.ToList();
                var products = await _db.Products
                    .Where(p => productIds.Contains(p.Id) && p.IsActive)
                    .ToListAsync();
                if (products.Count != productIds.Count)
                    return BadRequest(new { message = "One or more products are no longer available." });

                foreach (var (productId, qty) in wanted)
                {
                    var p = products.First(x => x.Id == productId);
                    if (p.Quantity < qty)
                        return BadRequest(new { message = $"Not enough stock for '{p.ProductName}'. Available: {p.Quantity}." });
                }

                decimal subTotalDp = 0, totalBv = 0;
                var snapshot = new List<object>();
                foreach (var (productId, qty) in wanted)
                {
                    var p = products.First(x => x.Id == productId);
                    subTotalDp += p.Dp * qty;
                    totalBv += p.Bv * qty;
                    snapshot.Add(new { productId = p.Id, productName = p.ProductName, quantity = qty, dp = p.Dp, bv = p.Bv });
                }

                bool hasPreviousOrder = await _db.PickupCenterOrders.AnyAsync(o => o.PickupCenterId == center.Id);
                if (!hasPreviousOrder && subTotalDp < MinOrderDp)
                    return BadRequest(new { message = $"Minimum order value is ₹{MinOrderDp:N0} DP for your first order. Your cart totals ₹{subTotalDp:N0} DP." });

                var discountAmount = Math.Round(subTotalDp * DiscountPercent / 100m, 2);
                var total = subTotalDp - discountAmount;

                var wallet = await _db.PickupCenterWallets.FirstOrDefaultAsync(w => w.PickupCenterId == center.Id);
                var balance = wallet?.Balance ?? 0;
                if (wallet == null || balance < total)
                    return BadRequest(new
                    {
                        message = $"Insufficient wallet balance. You have ₹{balance:N2} but this order needs ₹{total:N2}. Add ₹{(total - balance):N2} more to your wallet.",
                        balance,
                        required = total
                    });

                var strategy = _db.Database.CreateExecutionStrategy();
                int orderId = 0;
                decimal newBalance = 0;

                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _db.Database.BeginTransactionAsync();
                    try
                    {
                        var now = DateTime.UtcNow;

                        var order = new PickupCenterOrder
                        {
                            PickupCenterId = center.Id,
                            PucId = center.PucId,
                            CenterName = center.CenterName,
                            ContactName = center.FullName,
                            ContactPhone = center.Phone,
                            UtrNumber = $"WALLET-{now:yyyyMMddHHmmssfff}",   // marks "paid from wallet"
                            ScreenshotUrl = null,
                            ItemsJson = JsonSerializer.Serialize(snapshot),
                            SubTotalDp = subTotalDp,
                            DiscountPercent = DiscountPercent,
                            DiscountAmount = discountAmount,
                            TotalAmount = total,
                            TotalBv = totalBv,
                            Status = PickupCenterOrderStatus.Pending,
                            RequestedAt = now
                        };
                        _db.PickupCenterOrders.Add(order);
                        await _db.SaveChangesAsync();          // get order.Id

                        wallet!.Balance -= total;
                        wallet.UpdatedAt = now;

                        _db.PickupCenterWalletTransactions.Add(new PickupCenterWalletTransaction
                        {
                            PickupCenterId = center.Id,
                            PucId = center.PucId,
                            Type = WalletTransactionType.Debit,
                            Amount = total,
                            BalanceAfter = wallet.Balance,
                            Source = "Stock Purchase",
                            Description = $"Order #{order.Id} (pending approval): DP total ₹{subTotalDp:N2} less {DiscountPercent:0.##}% (₹{discountAmount:N2})",
                            ReferenceId = $"order-{order.Id}",
                            CreatedAt = now
                        });

                        await _db.SaveChangesAsync();
                        await tx.CommitAsync();
                        orderId = order.Id;
                        newBalance = wallet.Balance;
                    }
                    catch
                    {
                        await tx.RollbackAsync();
                        throw;
                    }
                });

                return Ok(new
                {
                    message = "Payment deducted from your wallet. Your order is awaiting admin approval — stock will be added to your inventory once approved.",
                    id = orderId,
                    subTotalDp,
                    discountPercent = DiscountPercent,
                    discountAmount,
                    totalAmount = total,
                    totalBv,
                    status = "Pending",
                    walletBalance = newBalance
                });
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"[Wallet Purchase Error] {detail}");
                return StatusCode(500, new { message = $"Could not complete the purchase: {detail}" });
            }
            finally
            {
                _lock.Release();
            }
        }
    }
}
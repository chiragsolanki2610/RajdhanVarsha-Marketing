using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/Admin")]
    [Authorize(Roles = "Admin")]
    public class AdminPickupCenterReturnsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private static readonly SemaphoreSlim _lock = new(1, 1);

        public AdminPickupCenterReturnsController(AppDbContext db) => _db = db;

        // GET /api/Admin/pickup-center-returns?status=Pending
        [HttpGet("pickup-center-returns")]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null)
        {
            var query = _db.PickupCenterReturnRequests.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<PickupCenterReturnStatus>(status, true, out var parsed))
                query = query.Where(r => r.Status == parsed);

            var rows = await query.OrderByDescending(r => r.RequestedAt).ToListAsync();
            return Ok(rows.Select(PickupCenterReturnsController.MapToDto).ToList());
        }

        // PUT /api/Admin/pickup-center-returns/{id}/status
        //   { "status": "Approved" | "Rejected", "rejectionReason": "..." }
        //
        // Rejected -> only the status changes. Nothing else happens.
        // Approved -> in ONE transaction:
        //     1. reduce the center's inventory
        //     2. add the units back to the company's Product.Quantity
        //     3. credit the center's wallet with CreditAmount (DP total - 6%)
        [HttpPut("pickup-center-returns/{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] ReturnStatusUpdateDto dto)
        {
            var wanted = dto.Status?.Trim();
            bool approve = string.Equals(wanted, "Approved", StringComparison.OrdinalIgnoreCase);
            bool reject = string.Equals(wanted, "Rejected", StringComparison.OrdinalIgnoreCase);
            if (!approve && !reject)
                return BadRequest(new { message = "Status must be 'Approved' or 'Rejected'." });

            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("userId")
                       ?? "Admin";

            await _lock.WaitAsync();
            try
            {
                var request = await _db.PickupCenterReturnRequests.FirstOrDefaultAsync(r => r.Id == id);
                if (request == null)
                    return NotFound(new { message = "Return request not found." });

                if (request.Status != PickupCenterReturnStatus.Pending)
                    return BadRequest(new { message = $"This request has already been {request.Status.ToString().ToLower()}." });

                if (reject)
                {
                    request.Status = PickupCenterReturnStatus.Rejected;
                    request.ProcessedAt = DateTime.UtcNow;
                    request.ProcessedByAdminId = adminId;
                    request.RejectionReason = string.IsNullOrWhiteSpace(dto.RejectionReason)
                        ? null : dto.RejectionReason.Trim();
                    await _db.SaveChangesAsync();
                    return Ok(new { message = "Return request rejected.", id });
                }

                // ---------- Approve ----------
                var items = PickupCenterReturnsController.ParseItems(request.ItemsJson);
                if (items.Count == 0)
                    return StatusCode(500, new { message = "Return items are corrupted and cannot be processed." });

                var productIds = items.Select(i => i.ProductId).ToList();
                var inventory = await _db.PickupCenterInventoryItems
                    .Where(i => i.PickupCenterId == request.PickupCenterId && productIds.Contains(i.ProductId))
                    .ToListAsync();

                // Re-check: the center may have sold some of this stock since it made the request.
                foreach (var item in items)
                {
                    var held = inventory.FirstOrDefault(i => i.ProductId == item.ProductId)?.Quantity ?? 0;
                    if (held < item.Quantity)
                        return BadRequest(new
                        {
                            message = $"Center only holds {held} of '{item.ProductName}' now (needs {item.Quantity}). Reject this request or ask the center to resubmit."
                        });
                }

                var products = await _db.Products.Where(p => productIds.Contains(p.Id)).ToListAsync();

                var strategy = _db.Database.CreateExecutionStrategy();
                decimal newBalance = 0;

                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _db.Database.BeginTransactionAsync();
                    try
                    {
                        var now = DateTime.UtcNow;

                        foreach (var item in items)
                        {
                            var inv = inventory.First(i => i.ProductId == item.ProductId);
                            inv.Quantity -= item.Quantity;
                            inv.UpdatedAt = now;

                            // Goods go back to the company warehouse.
                            // (Remove this block if you don't want company stock to increase.)
                            var product = products.FirstOrDefault(p => p.Id == item.ProductId);
                            if (product != null)
                            {
                                product.Quantity += item.Quantity;
                                product.UpdatedAt = now;
                            }
                        }

                        var wallet = await _db.PickupCenterWallets
                            .FirstOrDefaultAsync(w => w.PickupCenterId == request.PickupCenterId);
                        if (wallet == null)
                        {
                            wallet = new PickupCenterWallet
                            {
                                PickupCenterId = request.PickupCenterId,
                                PucId = request.PucId
                            };
                            _db.PickupCenterWallets.Add(wallet);
                        }

                        wallet.Balance += request.CreditAmount;
                        wallet.TotalEarned += request.CreditAmount;
                        wallet.UpdatedAt = now;

                        _db.PickupCenterWalletTransactions.Add(new PickupCenterWalletTransaction
                        {
                            PickupCenterId = request.PickupCenterId,
                            PucId = request.PucId,
                            Type = WalletTransactionType.Credit,
                            Amount = request.CreditAmount,
                            BalanceAfter = wallet.Balance,
                            Source = "Stock Return",
                            Description = $"Return RET-{request.Id:D6}: DP total ₹{request.SubTotalDp:N2} less {request.DeductionPercent:0.##}% (₹{request.DeductionAmount:N2})",
                            ReferenceId = $"return-{request.Id}",
                            CreatedAt = now
                        });

                        request.Status = PickupCenterReturnStatus.Approved;
                        request.ProcessedAt = now;
                        request.ProcessedByAdminId = adminId;

                        await _db.SaveChangesAsync();
                        await tx.CommitAsync();
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
                    message = $"Return approved. ₹{request.CreditAmount:N2} credited to the center's wallet.",
                    id,
                    credited = request.CreditAmount,
                    walletBalance = newBalance
                });
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"[Return Approval Error] id={id}: {detail}");
                return StatusCode(500, new { message = $"Could not process this return: {detail}" });
            }
            finally
            {
                _lock.Release();
            }
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Controllers
{
    // Pickup-center side of "Return stock to company" + the center's wallet.
    // Shares the api/PickupCenter prefix with PickupCenterController; none of
    // these routes clash with its existing ones.
    [ApiController]
    [Route("api/PickupCenter")]
    [Authorize(Roles = "PickupCenter")]
    public class PickupCenterReturnsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PickupCenterReturnsController(AppDbContext db) => _db = db;

        private string CurrentPucId =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("PucId claim missing from token.");

        // Units of each product already tied up in this center's PENDING return requests.
        private async Task<Dictionary<int, int>> GetPendingReservedAsync(int pickupCenterId)
        {
            var pendingJson = await _db.PickupCenterReturnRequests
                .AsNoTracking()
                .Where(r => r.PickupCenterId == pickupCenterId && r.Status == PickupCenterReturnStatus.Pending)
                .Select(r => r.ItemsJson)
                .ToListAsync();

            var reserved = new Dictionary<int, int>();
            foreach (var json in pendingJson)
            {
                foreach (var item in ParseItems(json))
                    reserved[item.ProductId] = reserved.GetValueOrDefault(item.ProductId) + item.Quantity;
            }
            return reserved;
        }

        // GET /api/PickupCenter/returns/eligible-stock
        // The center's inventory MINUS units already sitting in pending return requests.
        [HttpGet("returns/eligible-stock")]
        public async Task<IActionResult> GetEligibleStock()
        {
            var center = await _db.PickupCenters.AsNoTracking().FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var rows = await (
                from inv in _db.PickupCenterInventoryItems.AsNoTracking()
                where inv.PickupCenterId == center.Id && inv.Quantity > 0
                join p in _db.Products.AsNoTracking() on inv.ProductId equals p.Id
                orderby p.ProductName
                select new PickupCenterInventoryItemDto
                {
                    ProductId = p.Id,
                    ProductNo = p.ProductNo,
                    ProductName = p.ProductName,
                    Category = p.Category,
                    ImageUrl = p.ImageUrl,
                    Dp = p.Dp,
                    Bv = p.Bv,
                    Mrp = p.Mrp,
                    Quantity = inv.Quantity
                }).ToListAsync();

            var reserved = await GetPendingReservedAsync(center.Id);
            foreach (var r in rows)
                r.Quantity -= reserved.GetValueOrDefault(r.ProductId);

            return Ok(rows.Where(r => r.Quantity > 0).ToList());
        }

        // POST /api/PickupCenter/returns   { items:[{productId,quantity}], reason? }
        // Creates a Pending request. Nothing moves until admin approves.
        [HttpPost("returns")]
        public async Task<IActionResult> SubmitReturn([FromBody] SubmitReturnRequestDto dto)
        {
            var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Select at least one product to return." });
            if (dto.Items.Any(i => i.Quantity <= 0))
                return BadRequest(new { message = "Quantity must be at least 1." });

            // Merge duplicate product lines
            var wanted = dto.Items
                .GroupBy(i => i.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            var productIds = wanted.Keys.ToList();
            var products = await _db.Products.AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();
            if (products.Count != productIds.Count)
                return BadRequest(new { message = "One or more products were not found." });

            var invRows = await _db.PickupCenterInventoryItems.AsNoTracking()
                .Where(i => i.PickupCenterId == center.Id && productIds.Contains(i.ProductId))
                .ToListAsync();

            var reserved = await GetPendingReservedAsync(center.Id);

            decimal subTotalDp = 0;
            var snapshot = new List<object>();
            foreach (var (productId, qty) in wanted)
            {
                var product = products.First(p => p.Id == productId);
                var held = invRows.FirstOrDefault(r => r.ProductId == productId)?.Quantity ?? 0;
                var free = held - reserved.GetValueOrDefault(productId);

                if (qty > free)
                    return BadRequest(new
                    {
                        message = free <= 0 && held > 0
                            ? $"All your '{product.ProductName}' stock is already in a pending return request."
                            : $"You can return at most {Math.Max(free, 0)} of '{product.ProductName}'."
                    });

                subTotalDp += product.Dp * qty;
                snapshot.Add(new
                {
                    productId = product.Id,
                    productNo = product.ProductNo,
                    productName = product.ProductName,
                    quantity = qty,
                    dp = product.Dp
                });
            }

            var (deduction, credit) = ReturnRules.Calculate(subTotalDp);

            var request = new PickupCenterReturnRequest
            {
                PickupCenterId = center.Id,
                PucId = center.PucId,
                CenterName = center.CenterName,
                ItemsJson = JsonSerializer.Serialize(snapshot),
                SubTotalDp = subTotalDp,
                DeductionPercent = ReturnRules.DeductionPercent,
                DeductionAmount = deduction,
                CreditAmount = credit,
                Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim(),
                Status = PickupCenterReturnStatus.Pending,
                RequestedAt = DateTime.UtcNow
            };

            _db.PickupCenterReturnRequests.Add(request);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Return request sent to the company. You'll see the result here once it's reviewed.",
                request = MapToDto(request)
            });
        }

        // GET /api/PickupCenter/returns — this center's return history
        [HttpGet("returns")]
        public async Task<IActionResult> GetMyReturns()
        {
            var center = await _db.PickupCenters.AsNoTracking().FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var rows = await _db.PickupCenterReturnRequests.AsNoTracking()
                .Where(r => r.PickupCenterId == center.Id)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            return Ok(rows.Select(MapToDto).ToList());
        }

        // GET /api/PickupCenter/wallet
        [HttpGet("wallet")]
        public async Task<IActionResult> GetWallet()
        {
            var center = await _db.PickupCenters.AsNoTracking().FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var wallet = await _db.PickupCenterWallets.AsNoTracking()
                .FirstOrDefaultAsync(w => w.PickupCenterId == center.Id);

            return Ok(new PickupCenterWalletDto
            {
                Balance = wallet?.Balance ?? 0,
                TotalEarned = wallet?.TotalEarned ?? 0,
                TotalWithdrawn = wallet?.TotalWithdrawn ?? 0
            });
        }

        // GET /api/PickupCenter/wallet/transactions
        [HttpGet("wallet/transactions")]
        public async Task<IActionResult> GetWalletTransactions()
        {
            var center = await _db.PickupCenters.AsNoTracking().FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var txs = await _db.PickupCenterWalletTransactions.AsNoTracking()
                .Where(t => t.PickupCenterId == center.Id)
                .OrderByDescending(t => t.CreatedAt)
                .Take(200)
                .Select(t => new PickupCenterWalletTransactionDto
                {
                    Id = t.Id,
                    Type = t.Type.ToString(),
                    Amount = t.Amount,
                    BalanceAfter = t.BalanceAfter,
                    Source = t.Source,
                    Description = t.Description,
                    ReferenceId = t.ReferenceId,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(txs);
        }

        // ── helpers (public static so the admin controller can reuse them) ──
        public static List<ReturnItemDto> ParseItems(string json)
        {
            var items = new List<ReturnItemDto>();
            try
            {
                using var doc = JsonDocument.Parse(json);
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    var qty = el.GetProperty("quantity").GetInt32();
                    var dp = el.GetProperty("dp").GetDecimal();
                    items.Add(new ReturnItemDto
                    {
                        ProductId = el.GetProperty("productId").GetInt32(),
                        ProductNo = el.TryGetProperty("productNo", out var no) ? no.GetString() ?? "" : "",
                        ProductName = el.GetProperty("productName").GetString() ?? "Item",
                        Quantity = qty,
                        Dp = dp,
                        LineTotal = dp * qty
                    });
                }
            }
            catch (JsonException) { /* malformed row -> empty list */ }
            return items;
        }

        public static PickupCenterReturnDto MapToDto(PickupCenterReturnRequest r) => new()
        {
            Id = r.Id,
            RequestNo = $"RET-{r.Id:D6}",
            PucId = r.PucId,
            CenterName = r.CenterName,
            Items = ParseItems(r.ItemsJson),
            SubTotalDp = r.SubTotalDp,
            DeductionPercent = r.DeductionPercent,
            DeductionAmount = r.DeductionAmount,
            CreditAmount = r.CreditAmount,
            Reason = r.Reason,
            Status = r.Status.ToString(),
            RequestedAt = r.RequestedAt,
            ProcessedAt = r.ProcessedAt,
            RejectionReason = r.RejectionReason
        };
    }
}

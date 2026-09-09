using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Services;
using System.Security.Claims;
using System.Text.Json;

namespace RegisterApi.Controllers
{
    // ─────────────────────────────────────────────────────────────────────
    // Pickup Center → Plan Manager
    // Lets a pickup center owner activate EITHER plan (Dream or Binary) on
    // behalf of a member, by typing that member's UserId. Flow:
    //   1) LOOKUP   -> find the user, tell the owner whether a sponsor is
    //                  already on file for the chosen plan.
    //   2) SET-SPONSOR (only if missing) -> owner types the sponsor id the
    //                  member told them, we validate + attach it / join the
    //                  binary tree under it.
    //   3) PRODUCTS -> this center's own sellable stock (reuses inventory).
    //   4) ACTIVATE -> owner picks products (>= 600 BV), confirms payment
    //                  collected in person, we record the sale, credit BV,
    //                  activate the plan/binary node, and let the existing
    //                  commission engine run automatically.
    // ─────────────────────────────────────────────────────────────────────
    [ApiController]
    [Route("api/PickupCenter/plan-manager")]
    [Authorize(Roles = "PickupCenter")]
    public class PlanManagerController : ControllerBase
    {
        private const decimal MinActivationBv = 600m;

        private readonly AppDbContext _db;
        private readonly ICommissionService _commissionService;
        private readonly IBinaryPlanService _binaryPlanService;
        private readonly IReceiptService _receiptService;

        public PlanManagerController(
            AppDbContext db,
            ICommissionService commissionService,
            IBinaryPlanService binaryPlanService,
            IReceiptService receiptService)
        {
            _db = db;
            _commissionService = commissionService;
            _binaryPlanService = binaryPlanService;
            _receiptService = receiptService;
        }

        private string CurrentPucId =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("PucId claim missing from token.");

        // ─────────────────────────────────────────────────────────────
        // GET /api/PickupCenter/plan-manager/lookup/{userId}?planType=Dream Plan
        // Step 1: owner enters the member's userId + which plan.
        // ─────────────────────────────────────────────────────────────
        [HttpGet("lookup/{userId}")]
        public async Task<IActionResult> LookupUser(string userId, [FromQuery] string planType)
        {
            var normalizedPlan = NormalizePlanType(planType);
            if (normalizedPlan == null)
                return BadRequest(new { message = "planType must be 'Dream Plan' or 'Binary Plan'." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId.Trim());
            if (user == null)
                return NotFound(new { message = $"No user found with ID '{userId}'." });

            bool hasSponsor;
            bool alreadyActiveForPlan;
            string? sponsorId = null;
            string? sponsorName = null;

            if (normalizedPlan == "Dream Plan")
            {
                hasSponsor = !string.IsNullOrWhiteSpace(user.SponsorId);
                sponsorId = user.SponsorId;
                sponsorName = user.SponsorIdName;
                alreadyActiveForPlan = user.IsActive && user.SelectedPlan == "Dream Plan";
            }
            else // Binary Plan
            {
                var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == user.UserId);
                hasSponsor = node != null; // joining the tree IS attaching a sponsor for binary
                sponsorId = node?.SponsorId;
                alreadyActiveForPlan = node?.IsActive == true;
            }

            return Ok(new
            {
                userId = user.UserId,
                name = user.Name,
                mobileNo = user.MobileNo,
                planType = normalizedPlan,
                hasSponsor,
                sponsorId,
                sponsorName,
                alreadyActiveForPlan,
                requiredBv = MinActivationBv
            });
        }

        // ─────────────────────────────────────────────────────────────
        // POST /api/PickupCenter/plan-manager/set-sponsor
        // Step 2 (only when lookup said hasSponsor = false).
        // ─────────────────────────────────────────────────────────────
        [HttpPost("set-sponsor")]
        public async Task<IActionResult> SetSponsor([FromBody] PlanManagerSetSponsorDto dto)
        {
            var normalizedPlan = NormalizePlanType(dto.PlanType);
            if (normalizedPlan == null)
                return BadRequest(new { message = "planType must be 'Dream Plan' or 'Binary Plan'." });

            if (string.IsNullOrWhiteSpace(dto.UserId) || string.IsNullOrWhiteSpace(dto.SponsorId))
                return BadRequest(new { message = "userId and sponsorId are required." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == dto.UserId.Trim());
            if (user == null)
                return NotFound(new { message = $"No user found with ID '{dto.UserId}'." });

            var trimmedSponsorId = dto.SponsorId.Trim();
            if (string.Equals(trimmedSponsorId, user.UserId, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "A user cannot sponsor themselves." });

            var sponsor = await _db.Users.FirstOrDefaultAsync(u => u.UserId == trimmedSponsorId);
            if (sponsor == null)
                return BadRequest(new { message = "Sponsor ID does not exist. Please confirm it with the member." });

            if (normalizedPlan == "Dream Plan")
            {
                if (!string.IsNullOrWhiteSpace(user.SponsorId))
                    return BadRequest(new { message = "This user already has a sponsor on file." });

                user.SponsorId = sponsor.UserId;
                user.SponsorIdName = sponsor.Name;
                await _db.SaveChangesAsync();

                return Ok(new { message = "Sponsor set.", sponsorId = sponsor.UserId, sponsorName = sponsor.Name });
            }
            else // Binary Plan -> joining the tree under the sponsor
            {
                var existingNode = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == user.UserId);
                if (existingNode != null)
                    return BadRequest(new { message = "This user is already placed in the binary tree." });

                var preferredPosition = string.IsNullOrWhiteSpace(dto.PreferredPosition) ? "LEFT" : dto.PreferredPosition.Trim().ToUpperInvariant();
                if (preferredPosition != "LEFT" && preferredPosition != "RIGHT")
                    return BadRequest(new { message = "preferredPosition must be LEFT or RIGHT." });

                var placement = await _binaryPlanService.PlaceUserInBinaryTreeAsync(user.UserId, sponsor.UserId, preferredPosition);
                if (!placement.Success)
                    return BadRequest(new { message = placement.Message });

                return Ok(new { message = "User placed in binary tree.", sponsorId = sponsor.UserId, placement });
            }
        }

        // ─────────────────────────────────────────────────────────────
        // GET /api/PickupCenter/plan-manager/products
        // Step 3: this center's own in-stock products to build the cart from.
        // (Same data as GET /api/PickupCenter/inventory — exposed here too so
        //  the plan-manager page doesn't need a second permission set.)
        // ─────────────────────────────────────────────────────────────
        [HttpGet("products")]
        public async Task<IActionResult> GetSellableProducts([FromQuery] string? search = null)
        {
            var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var query =
                from inv in _db.PickupCenterInventoryItems
                where inv.PickupCenterId == center.Id && inv.Quantity > 0
                join p in _db.Products on inv.ProductId equals p.Id
                where p.IsActive
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
                };

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(i => i.ProductName.Contains(search));

            var result = await query.OrderBy(i => i.ProductName).ToListAsync();
            return Ok(result);
        }

        // ─────────────────────────────────────────────────────────────
        // POST /api/PickupCenter/plan-manager/activate
        // Step 4: final confirm. Validates >= 600 BV, sponsor present,
        // deducts this center's own stock, activates the plan, and lets
        // the normal commission engine run — same as the self-checkout /
        // admin-approval flows, just triggered by the pickup center.
        // ─────────────────────────────────────────────────────────────
        [HttpPost("activate")]
        public async Task<IActionResult> ActivatePlan([FromBody] PlanManagerActivateDto dto)
        {
            var normalizedPlan = NormalizePlanType(dto.PlanType);
            if (normalizedPlan == null)
                return BadRequest(new { message = "planType must be 'Dream Plan' or 'Binary Plan'." });

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Select at least one product." });

            if (dto.Items.Any(i => i.Quantity <= 0))
                return BadRequest(new { message = "Item quantity must be at least 1." });

            var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var buyer = await _db.Users.FirstOrDefaultAsync(u => u.UserId == dto.UserId.Trim());
            if (buyer == null)
                return NotFound(new { message = $"No user found with ID '{dto.UserId}'." });

            // ── Sponsor gate (mirrors OrdersController's server-side backstop) ──
            if (normalizedPlan == "Dream Plan")
            {
                if (string.IsNullOrWhiteSpace(buyer.SponsorId))
                    return BadRequest(new { message = "This user has no Sponsor ID yet. Set it first." });
            }

            BinaryNode? binaryNode = null;
            if (normalizedPlan == "Binary Plan")
            {
                binaryNode = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == buyer.UserId);
                if (binaryNode == null)
                    return BadRequest(new { message = "This user hasn't been placed in the binary tree yet. Set a sponsor first." });

                if (binaryNode.IsActive)
                    return BadRequest(new { message = "This user's Binary Plan ID is already active." });
            }

            // ── Pull this PUC's own stock rows — a PUC can only sell what it holds ──
            var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
            var invRows = await _db.PickupCenterInventoryItems
                .Where(inv => inv.PickupCenterId == center.Id && productIds.Contains(inv.ProductId))
                .ToListAsync();

            var products = await _db.Products
                .Where(p => productIds.Contains(p.Id) && p.IsActive)
                .ToListAsync();

            if (products.Count != productIds.Count)
                return BadRequest(new { message = "One or more products are no longer available." });

            foreach (var item in dto.Items)
            {
                var stockRow = invRows.FirstOrDefault(r => r.ProductId == item.ProductId);
                var available = stockRow?.Quantity ?? 0;
                if (available < item.Quantity)
                {
                    var name = products.First(p => p.Id == item.ProductId).ProductName;
                    return BadRequest(new { message = $"Not enough stock for '{name}'. Available: {available}." });
                }
            }

            decimal totalAmount = 0, totalBv = 0;
            var receiptItems = new List<ReceiptItemData>();
            var itemSnapshots = new List<object>();
            foreach (var item in dto.Items)
            {
                var product = products.First(p => p.Id == item.ProductId);
                totalAmount += product.Mrp * item.Quantity;
                totalBv += product.Bv * item.Quantity;
                receiptItems.Add(new ReceiptItemData(product.ProductName, item.Quantity, product.Mrp));
                itemSnapshots.Add(new { productId = product.Id, productName = product.ProductName, quantity = item.Quantity, price = product.Mrp });
            }

            // ── Hard rule for BOTH plans: minimum 600 BV to activate ──
            if (totalBv < MinActivationBv)
                return BadRequest(new
                {
                    message = $"{normalizedPlan} requires at least {MinActivationBv} BV. Selected: {totalBv} BV.",
                    required = MinActivationBv,
                    selected = totalBv
                });

            // ── Deduct stock ──
            foreach (var item in dto.Items)
            {
                var stockRow = invRows.First(r => r.ProductId == item.ProductId);
                stockRow.Quantity -= item.Quantity;
                stockRow.UpdatedAt = DateTime.UtcNow;
            }

            buyer.BusinessVolume += (int)totalBv;
            buyer.IsActive = true;
            buyer.SelectedPlan = normalizedPlan;
            buyer.IdStatus = "active";

            var order = new PaymentOrder
            {
                UserId = buyer.UserId,
                UtrNumber = $"PUC-{center.PucId}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                PlanType = normalizedPlan,
                TotalAmount = totalAmount,
                TotalBv = totalBv,
                CartItemsJson = JsonSerializer.Serialize(itemSnapshots),
                Status = PaymentOrderStatus.Approved,
                RequestedAt = DateTime.UtcNow,
                ProcessedAt = DateTime.UtcNow,
                ProcessedByAdminId = null,
                AdminRemarks = $"Plan activated in person by pickup center {center.PucId} ({center.CenterName}) — {dto.PaymentMethod}.",
                SoldByPucId = center.PucId,
                ReceiptItemsJson = JsonSerializer.Serialize(receiptItems),
                ReceiptTotalAmount = totalAmount,
                ReceiptTotalBv = totalBv,
                ReceiptFinalized = true,
                ReceiptFinalizedAt = DateTime.UtcNow
            };

            _db.PaymentOrders.Add(order);

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PlanManager Activate Error] puc={center.PucId} user={buyer.UserId} {ex.Message}");
                return StatusCode(500, new { message = "Failed to activate plan. Please try again." });
            }

            // ── Binary Plan: activate node + award pair commission to parent ──
            if (normalizedPlan == "Binary Plan" && binaryNode != null)
            {
                try
                {
                    await _binaryPlanService.ActivateBinaryNodeAsync(buyer.UserId, totalBv, awardPairs: true);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[PlanManager Binary Activation Error] user={buyer.UserId} {ex.Message}");
                }
            }

            // ── Level commissions up the SponsorId chain (both plans) ──
            try
            {
                await _commissionService.DistributeProductPurchaseCommissionAsync(
                    buyer.UserId, totalBv, $"puc-plan-{order.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PlanManager Commission Error] order={order.Id} {ex.Message}");
            }

            try
            {
                order.ReceiptPdf = _receiptService.GenerateReceiptPdf(new ReceiptData(
                    OrderId: order.Id,
                    UserId: buyer.UserId,
                    CustomerName: buyer.Name,
                    UtrNumber: order.UtrNumber,
                    ReceiptDate: order.ProcessedAt.Value,
                    Items: receiptItems,
                    TotalAmount: totalAmount,
                    TotalBv: totalBv,
                    Notes: order.AdminRemarks
                ));
                order.ReceiptGeneratedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PlanManager Receipt Error] order={order.Id} {ex.Message}");
            }

            return Ok(new
            {
                message = $"{normalizedPlan} activated for {buyer.UserId}.",
                orderId = order.Id,
                userId = buyer.UserId,
                customerName = buyer.Name,
                totalAmount,
                totalBv,
                receiptAvailable = order.ReceiptPdf != null
            });
        }

        private static string? NormalizePlanType(string? planType)
        {
            var t = (planType ?? "").Trim();
            if (string.Equals(t, "Dream Plan", StringComparison.OrdinalIgnoreCase)) return "Dream Plan";
            if (string.Equals(t, "Binary Plan", StringComparison.OrdinalIgnoreCase)) return "Binary Plan";
            return null;
        }
    }
}

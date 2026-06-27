using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Services;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/Plans")]
    [Authorize]
    public class PlanController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ICommissionService _commissionService;

        // Move this to a DB-backed PlanTypes table later if you want it admin-editable
        private static readonly Dictionary<string, int> PlanBvRequirement = new()
        {
            { "Dream Plan", 600 },
            { "Binary Plan", 600 }
        };

        public PlanController(AppDbContext db, ICommissionService commissionService)
        {
            _db = db;
            _commissionService = commissionService;
        }

        // ---------------------------------------------------------------
        // GET /api/Plans/my-plan
        // Returns the current logged-in user's plan/purchase status.
        // Used by the dashboard to show ACTIVE/INACTIVE, purchase date, BV.
        // ---------------------------------------------------------------
        [HttpGet("my-plan")]
        public async Task<IActionResult> GetMyPlan()
        {
            var userId = User.FindFirst("userId")?.Value
                       ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            // Fetch latest of EACH plan type separately
            var latestDreamPlan = await _db.Plans
                .Where(p => p.UserId == user.UserId && p.Status == PlanStatus.Paid && p.PlanType == "Dream Plan")
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            var latestBinaryPlan = await _db.Plans
                .Where(p => p.UserId == user.UserId && p.Status == PlanStatus.Paid && p.PlanType == "Binary Plan")
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            var totalSells = await _db.Plans
                .CountAsync(p => p.UserId == user.UserId && p.Status == PlanStatus.Paid);

            // Use whichever is more recent as the "primary" plan
            var latestPlan = (latestDreamPlan?.CreatedAt ?? DateTime.MinValue) >= (latestBinaryPlan?.CreatedAt ?? DateTime.MinValue)
                ? latestDreamPlan
                : latestBinaryPlan;

            return Ok(new
            {
                isActive = user.IsActive,
                purchaseDate = latestPlan?.CreatedAt,
                bv = latestPlan?.TotalBv ?? 0,
                planType = latestPlan?.PlanType,
                totalSells,
                // ── NEW: individual active flags for each plan ──
                dreamIsActive = latestDreamPlan != null,
                binaryIsActive = latestBinaryPlan != null
            });
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] PlanCheckoutDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "No products selected." });

            if (!PlanBvRequirement.TryGetValue(dto.PlanType, out var requiredBv))
                return BadRequest(new { message = $"Unknown plan '{dto.PlanType}'." });

            var userId = User.FindFirst("userId")?.Value
                       ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            var productIds = dto.Items.Select(i => i.ProductId).ToList();
            var products = await _db.Products
                .Where(p => productIds.Contains(p.Id) && p.IsActive)
                .ToListAsync();

            if (products.Count != productIds.Distinct().Count())
                return BadRequest(new { message = "One or more products are invalid or unavailable." });

            var plan = new Plan
            {
                UserId = user.UserId,
                PlanType = dto.PlanType,
                Status = PlanStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            decimal totalBv = 0, totalAmount = 0;

            foreach (var item in dto.Items)
            {
                var product = products.First(p => p.Id == item.ProductId);
                if (item.Quantity <= 0)
                    return BadRequest(new { message = $"Invalid quantity for {product.ProductName}." });

                plan.Items.Add(new PlanItem
                {
                    ProductId = product.Id,
                    Quantity = item.Quantity,
                    Bv = product.Bv,
                    Mrp = product.Mrp
                });

                totalBv += product.Bv * item.Quantity;
                totalAmount += product.Mrp * item.Quantity;
            }

            plan.TotalBv = totalBv;
            plan.TotalAmount = totalAmount;

            // ⚠️ No payment gateway wired yet — see note below.
            plan.Status = PlanStatus.Paid;

            _db.Plans.Add(plan);

            // ✅ When plan is Paid and BV threshold is met:
            //    - Mark user as active
            //    - Set selected plan
            //    - Accumulate business volume
            //    - Set IdStatus to "active"
            if (plan.Status == PlanStatus.Paid && totalBv >= requiredBv)
            {
                user.IsActive = true;
                user.SelectedPlan = dto.PlanType;
                user.BusinessVolume += (int)totalBv;
                user.IdStatus = "active";
            }

            await _db.SaveChangesAsync();

            // ✅ Pay out level commissions: 10% self bonus to the buyer,
            //    then 12 levels up the SponsorId chain, into each person's
            //    "Dream Wallet". Runs for every paid purchase, independent
            //    of whether this particular order met the activation BV
            //    threshold above.
            if (plan.Status == PlanStatus.Paid)
            {
                await _commissionService.DistributeProductPurchaseCommissionAsync(
                    user.UserId, totalBv, plan.Id.ToString());
            }

            return Ok(new
            {
                message = user.IsActive
                    ? "Plan purchased and account activated."
                    : "Order placed, but BV threshold not yet met.",
                planId = plan.Id,
                totalBv = plan.TotalBv,
                userIsActive = user.IsActive,
                idStatus = user.IdStatus
            });
        }
    }
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/Plans")]
    [Authorize]
    public class PlanController : ControllerBase
    {
        private readonly AppDbContext _db;

        // Move this to a DB-backed PlanTypes table later if you want it admin-editable
        private static readonly Dictionary<string, int> PlanBvRequirement = new()
        {
            { "Dream Plan", 600 },
            { "Binary Plan", 600 }
        };

        public PlanController(AppDbContext db) => _db = db;

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

            // Most recent paid plan for this user
            var latestPlan = await _db.Plans
                .Where(p => p.UserId == user.UserId && p.Status == PlanStatus.Paid)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            var totalSells = await _db.Plans
                .CountAsync(p => p.UserId == user.UserId && p.Status == PlanStatus.Paid);

            return Ok(new
            {
                isActive = user.IsActive,
                purchaseDate = latestPlan?.CreatedAt,
                bv = latestPlan?.TotalBv ?? 0,
                planType = latestPlan?.PlanType,
                totalSells

                // NOTE: totalPayout, withdrawal, balance intentionally NOT
                // included here — those belong to a Wallet/Commission/
                // Transaction entity that doesn't exist in this controller's
                // scope. Add a WalletController (or extend this one) once
                // you have that table, then merge into the dashboard fetch.
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
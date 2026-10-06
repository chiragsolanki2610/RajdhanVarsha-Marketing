using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Controllers
{
    // Pickup-center side of "Add money to wallet".
    [ApiController]
    [Route("api/PickupCenter")]
    [Authorize(Roles = "PickupCenter")]
    public class PickupCenterTopUpController : ControllerBase
    {
        private const long MaxScreenshotBytes = 5 * 1024 * 1024; // 5 MB
        private static readonly string[] AllowedTypes = { "image/jpeg", "image/png", "image/webp" };
        private static readonly Regex UtrRegex = new("^[A-Za-z0-9]{12,22}$", RegexOptions.Compiled);

        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public PickupCenterTopUpController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        private string CurrentPucId =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("PucId claim missing from token.");

        private decimal MinAmount => _config.GetValue("CompanyPayment:MinTopUp", 100m);
        private decimal MaxAmount => _config.GetValue("CompanyPayment:MaxTopUp", 100000m);

        // GET /api/PickupCenter/topups/payment-info
        [HttpGet("topups/payment-info")]
        public IActionResult GetPaymentInfo() => Ok(new TopUpPaymentInfoDto
        {
            UpiId = _config["CompanyPayment:UpiId"] ?? "",
            PayeeName = _config["CompanyPayment:PayeeName"] ?? "Raj Dhanvarsha Marketing",
            MinAmount = MinAmount,
            MaxAmount = MaxAmount
        });

        // POST /api/PickupCenter/topups   (multipart: amount, utrNumber, screenshot)
        [HttpPost("topups")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Submit([FromForm] SubmitTopUpForm form)
        {
            var center = await _db.PickupCenters.AsNoTracking().FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var amount = Math.Round(form.Amount, 2);
            if (amount < MinAmount || amount > MaxAmount)
                return BadRequest(new { message = $"Amount must be between ₹{MinAmount:N0} and ₹{MaxAmount:N0}." });

            var utr = (form.UtrNumber ?? "").Trim().ToUpperInvariant();
            if (!UtrRegex.IsMatch(utr))
                return BadRequest(new { message = "Enter a valid UTR / transaction reference number (12–22 letters or digits)." });

            if (form.Screenshot == null || form.Screenshot.Length == 0)
                return BadRequest(new { message = "Please upload the payment screenshot." });
            if (form.Screenshot.Length > MaxScreenshotBytes)
                return BadRequest(new { message = "Screenshot must be 5 MB or smaller." });
            if (!AllowedTypes.Contains(form.Screenshot.ContentType?.ToLowerInvariant()))
                return BadRequest(new { message = "Screenshot must be a JPG, PNG or WebP image." });

            // One UTR can only back one live (Pending / Approved) request.
            var utrUsed = await _db.PickupCenterTopUpRequests.AnyAsync(r =>
                r.UtrNumber == utr && r.Status != PickupCenterTopUpStatus.Rejected);
            if (utrUsed)
                return BadRequest(new { message = "This UTR number has already been submitted." });

            byte[] bytes;
            using (var ms = new MemoryStream())
            {
                await form.Screenshot.CopyToAsync(ms);
                bytes = ms.ToArray();
            }

            var request = new PickupCenterTopUpRequest
            {
                PickupCenterId = center.Id,
                PucId = center.PucId,
                CenterName = center.CenterName,
                Amount = amount,
                UtrNumber = utr,
                ScreenshotBytes = bytes,
                ScreenshotContentType = form.Screenshot.ContentType!.ToLowerInvariant(),
                Status = PickupCenterTopUpStatus.Pending,
                RequestedAt = DateTime.UtcNow
            };

            _db.PickupCenterTopUpRequests.Add(request);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Payment submitted. The amount will be added to your wallet once the company verifies it.",
                request = MapToDto(request)
            });
        }

        // GET /api/PickupCenter/topups — this center's history
        [HttpGet("topups")]
        public async Task<IActionResult> GetMine()
        {
            var rows = await _db.PickupCenterTopUpRequests.AsNoTracking()
                .Where(r => r.PucId == CurrentPucId)
                .OrderByDescending(r => r.RequestedAt)
                .Take(200)
                .Select(r => new PickupCenterTopUpRequest
                {
                    Id = r.Id, PucId = r.PucId, CenterName = r.CenterName, Amount = r.Amount,
                    UtrNumber = r.UtrNumber, Status = r.Status, RequestedAt = r.RequestedAt,
                    ProcessedAt = r.ProcessedAt, RejectionReason = r.RejectionReason
                })
                .ToListAsync();

            return Ok(rows.Select(MapToDto).ToList());
        }

        public static TopUpDto MapToDto(PickupCenterTopUpRequest r) => new()
        {
            Id = r.Id,
            RequestNo = $"TOP-{r.Id:D6}",
            PucId = r.PucId,
            CenterName = r.CenterName,
            Amount = r.Amount,
            UtrNumber = r.UtrNumber,
            Status = r.Status.ToString(),
            RequestedAt = r.RequestedAt,
            ProcessedAt = r.ProcessedAt,
            RejectionReason = r.RejectionReason
        };
    }
}

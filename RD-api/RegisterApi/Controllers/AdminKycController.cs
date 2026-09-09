using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Helpers;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/Admin")]
    [Authorize(Roles = "Admin")] // Only admins can access these endpoints
    public class AdminKycController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminKycController(AppDbContext db)
        {
            _db = db;
        }

        // GET /api/Admin/kyc-requests
        // Returns all KYC submissions — used by your existing admin panel page.
        // NOTE: raw image bytes are intentionally NOT included in this list
        // response (they'd bloat the payload badly). Use the dedicated image
        // endpoint below to load a specific document image on demand.
        [HttpGet("kyc-requests")]
        public async Task<IActionResult> GetAllKycRequests([FromQuery] string? status = null)
        {
            var query = _db.KycRequests.AsQueryable();

            // Optional filter: ?status=Pending or ?status=Approved or ?status=Rejected
            if (!string.IsNullOrEmpty(status))
                query = query.Where(k => k.Status == status);

            var requests = await query
                .OrderByDescending(k => k.SubmittedAt)
                .Select(k => new
                {
                    k.Id,
                    k.UserId,
                    k.FullName,
                    k.MobileNo,
                    k.Age,
                    k.Dob,
                    k.Address,
                    k.AadharNo,
                    k.PanNo,
                    k.AccountHolderName,
                    k.AccountNo,
                    k.BankName,
                    k.IfscCode,
                    // Just flag whether each image exists — actual bytes are
                    // fetched separately via GetKycImage below.
                    HasAadharFrontImage = k.AadharFrontImage != null,
                    HasAadharBackImage = k.AadharBackImage != null,
                    HasPanCardImage = k.PanCardImage != null,
                    HasBankProofImage = k.BankProofImage != null,
                    k.Status,
                    k.SubmittedAt,
                    k.ReviewedAt,
                    k.RejectionReason
                })
                .ToListAsync();

            return Ok(requests);
        }

        // GET /api/Admin/kyc-requests/{id}
        // Get single KYC request details (still excludes raw bytes — see note above)
        [HttpGet("kyc-requests/{id}")]
        public async Task<IActionResult> GetKycRequest(int id)
        {
            var kyc = await _db.KycRequests.FindAsync(id);
            if (kyc == null) return NotFound(new { message = "KYC request not found." });

            return Ok(new
            {
                kyc.Id,
                kyc.UserId,
                kyc.FullName,
                kyc.MobileNo,
                kyc.Age,
                kyc.Dob,
                kyc.Address,
                kyc.AadharNo,
                kyc.PanNo,
                kyc.AccountHolderName,
                kyc.AccountNo,
                kyc.BankName,
                kyc.IfscCode,
                HasAadharFrontImage = kyc.AadharFrontImage != null,
                HasAadharBackImage = kyc.AadharBackImage != null,
                HasPanCardImage = kyc.PanCardImage != null,
                HasBankProofImage = kyc.BankProofImage != null,
                kyc.Status,
                kyc.SubmittedAt,
                kyc.ReviewedAt,
                kyc.RejectionReason
            });
        }

        // GET /api/Admin/kyc-requests/{id}/image/{type}
        // Serves a single document image as a real image response, so it can
        // be used directly as an <img src="..."> in the admin panel.
        // {type} must be one of: aadharFront, aadharBack, panCard, bankProof
        [HttpGet("kyc-requests/{id}/image/{type}")]
        public async Task<IActionResult> GetKycImage(int id, string type)
        {
            var kyc = await _db.KycRequests.FindAsync(id);
            if (kyc == null) return NotFound(new { message = "KYC request not found." });

            (byte[]? bytes, string? contentType) = type switch
            {
                "aadharFront" => (kyc.AadharFrontImage, kyc.AadharFrontImageContentType),
                "aadharBack" => (kyc.AadharBackImage, kyc.AadharBackImageContentType),
                "panCard" => (kyc.PanCardImage, kyc.PanCardImageContentType),
                "bankProof" => (kyc.BankProofImage, kyc.BankProofImageContentType),
                _ => (null, null)
            };

            if (bytes == null)
                return NotFound(new { message = "Image not found for this request." });

            return File(bytes, contentType ?? "application/octet-stream");
        }

        // PUT /api/Admin/kyc-requests/{id}/status
        // Approve or Reject — matches exactly what your existing admin panel calls
        [HttpPut("kyc-requests/{id}/status")]
        public async Task<IActionResult> UpdateKycStatus(int id, [FromBody] KycStatusUpdateDto dto)
        {
            if (dto.Status != "Approved" && dto.Status != "Rejected")
                return BadRequest(new { message = "Status must be 'Approved' or 'Rejected'." });

            var kyc = await _db.KycRequests.FindAsync(id);
            if (kyc == null) return NotFound(new { message = "KYC request not found." });

            // If approved — update the user's isKycCompleted flag in your Users table
            if (dto.Status == "Approved")
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == kyc.UserId);
                if (user != null)
                {
                    user.IsKycCompleted = true;
                    user.BankName = kyc.BankName;
                    user.AccountNo = kyc.AccountNo;
                    user.IfscCode = kyc.IfscCode;
                    user.AccountType = "Savings";

                    // Persist the uploaded KYC document images onto the User
                    // record before the KycRequest row is deleted below —
                    // otherwise they're lost the moment KYC is approved.
                    // Copy BOTH legacy string and new byte[] fields, whichever
                    // is populated on this particular request.
                    user.AadharFrontImageUrl = kyc.AadharFrontImageUrl;
                    user.AadharFrontImage = kyc.AadharFrontImage;
                    user.AadharFrontImageContentType = kyc.AadharFrontImageContentType;

                    user.AadharBackImageUrl = kyc.AadharBackImageUrl;
                    user.AadharBackImage = kyc.AadharBackImage;
                    user.AadharBackImageContentType = kyc.AadharBackImageContentType;

                    user.PanCardImageUrl = kyc.PanCardImageUrl;
                    user.PanCardImage = kyc.PanCardImage;
                    user.PanCardImageContentType = kyc.PanCardImageContentType;

                    user.BankProofImageUrl = kyc.BankProofImageUrl;
                    user.BankProofImage = kyc.BankProofImage;
                    user.BankProofImageContentType = kyc.BankProofImageContentType;
                }
            }

            // Once reviewed (approved or rejected), the request row is no longer needed
            _db.KycRequests.Remove(kyc);

            await _db.SaveChangesAsync();

            return Ok(new { message = $"KYC request {dto.Status} successfully.", id = id });
        }
    }
}

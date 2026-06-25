using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

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
        // Returns all KYC submissions — used by your existing admin panel page
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
                    k.AadharFrontImageUrl,
                    k.AadharBackImageUrl,
                    k.PanCardImageUrl,
                    k.BankProofImageUrl,
                    k.Status,
                    k.SubmittedAt,
                    k.ReviewedAt,
                    k.RejectionReason
                })
                .ToListAsync();

            return Ok(requests);
        }

        // GET /api/Admin/kyc-requests/{id}
        // Get single KYC request details
        [HttpGet("kyc-requests/{id}")]
        public async Task<IActionResult> GetKycRequest(int id)
        {
            var kyc = await _db.KycRequests.FindAsync(id);
            if (kyc == null) return NotFound(new { message = "KYC request not found." });
            return Ok(kyc);
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
                }
            }

            // Once reviewed (approved or rejected), the request row is no longer needed
            _db.KycRequests.Remove(kyc);

            await _db.SaveChangesAsync();

            return Ok(new { message = $"KYC request {dto.Status} successfully.", id = id });
        }
    }
}
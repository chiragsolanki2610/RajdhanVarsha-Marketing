using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using RegisterApi.Data;
using RegisterApi.Models;
using RegisterApi.DTOs;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/Kyc")]
    [Authorize]
    public class UserKycController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UserKycController(AppDbContext db)
        {
            _db = db;
        }

        // POST /api/Kyc/submit
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitKyc([FromBody] KycSubmitDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? User.FindFirstValue("sub");

            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Invalid token." });

            // Prevent duplicate submissions
            var existing = await _db.KycRequests
                .FirstOrDefaultAsync(k => k.UserId == userId && k.Status == "Pending");

            if (existing != null)
                return BadRequest(new { message = "You already have a pending KYC request." });

            var kyc = new KycRequest
            {
                UserId = userId,
                FullName = dto.FullName,
                MobileNo = dto.MobileNo,
                Age = dto.Age,
                Dob = dto.Dob,
                Address = dto.Address,
                AadharNo = dto.AadharNo,
                PanNo = dto.PanNo,
                AccountHolderName = dto.AccountHolderName,
                AccountNo = dto.AccountNo,
                BankName = dto.BankName,
                IfscCode = dto.IfscCode,
                AadharFrontImageUrl = dto.AadharFrontImageUrl,
                AadharBackImageUrl = dto.AadharBackImageUrl,
                PanCardImageUrl = dto.PanCardImageUrl,
                BankProofImageUrl = dto.BankProofImageUrl,
                Status = "Pending",
                SubmittedAt = DateTime.UtcNow
            };

            _db.KycRequests.Add(kyc);
            await _db.SaveChangesAsync();

            return Ok(new { message = "KYC submitted successfully.", id = kyc.Id });
        }
    }
}
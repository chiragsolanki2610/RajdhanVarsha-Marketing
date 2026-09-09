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

        // Keep this in sync with MAX_FILE_SIZE_MB on the frontend (page.tsx).
        private const long MaxFileSizeBytes = 8 * 1024 * 1024; // 8MB

        public UserKycController(AppDbContext db)
        {
            _db = db;
        }

        // POST /api/Kyc/submit
        // Accepts multipart/form-data. Images are read into raw byte[] and
        // stored directly in the database — no base64 conversion, no third
        // party storage.
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitKyc([FromForm] KycSubmitFormDto dto)
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

            // Validate the four required files explicitly so we return a clear
            // 400 instead of a confusing null-reference or DB error.
            var fileChecks = new (IFormFile? File, string Label)[]
            {
                (dto.AadharFrontImage, "Aadhaar Front"),
                (dto.AadharBackImage, "Aadhaar Back"),
                (dto.PanCardImage, "PAN Card"),
                (dto.BankProofImage, "Bank Proof")
            };

            foreach (var (file, label) in fileChecks)
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = $"{label} image is required." });

                if (file.Length > MaxFileSizeBytes)
                    return BadRequest(new { message = $"{label} image exceeds the {MaxFileSizeBytes / 1024 / 1024}MB limit." });
            }

            try
            {
                var aadharFrontBytes = await ReadFileBytesAsync(dto.AadharFrontImage!);
                var aadharBackBytes = await ReadFileBytesAsync(dto.AadharBackImage!);
                var panCardBytes = await ReadFileBytesAsync(dto.PanCardImage!);
                var bankProofBytes = await ReadFileBytesAsync(dto.BankProofImage!);

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

                    AadharFrontImage = aadharFrontBytes,
                    AadharFrontImageContentType = dto.AadharFrontImage!.ContentType,

                    AadharBackImage = aadharBackBytes,
                    AadharBackImageContentType = dto.AadharBackImage!.ContentType,

                    PanCardImage = panCardBytes,
                    PanCardImageContentType = dto.PanCardImage!.ContentType,

                    BankProofImage = bankProofBytes,
                    BankProofImageContentType = dto.BankProofImage!.ContentType,

                    Status = "Pending",
                    SubmittedAt = DateTime.UtcNow
                };

                _db.KycRequests.Add(kyc);
                await _db.SaveChangesAsync();

                return Ok(new { message = "KYC submitted successfully.", id = kyc.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "KYC submission failed while processing uploaded files.", detail = ex.Message });
            }
        }

        private static async Task<byte[]> ReadFileBytesAsync(IFormFile file)
        {
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            return memoryStream.ToArray();
        }
    }
}

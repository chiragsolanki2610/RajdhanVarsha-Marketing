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
    public class AdminPickupCenterTopUpController : ControllerBase
    {
        private readonly AppDbContext _db;
        private static readonly SemaphoreSlim _lock = new(1, 1);

        public AdminPickupCenterTopUpController(AppDbContext db) => _db = db;

        // GET /api/Admin/pickup-center-topups?status=Pending
        [HttpGet("pickup-center-topups")]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null)
        {
            var query = _db.PickupCenterTopUpRequests.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<PickupCenterTopUpStatus>(status, true, out var parsed))
                query = query.Where(r => r.Status == parsed);

            // Project without the screenshot bytes — they're fetched separately.
            var rows = await query.OrderByDescending(r => r.RequestedAt)
                .Select(r => new PickupCenterTopUpRequest
                {
                    Id = r.Id, PucId = r.PucId, CenterName = r.CenterName, Amount = r.Amount,
                    UtrNumber = r.UtrNumber, Status = r.Status, RequestedAt = r.RequestedAt,
                    ProcessedAt = r.ProcessedAt, RejectionReason = r.RejectionReason
                })
                .ToListAsync();

            return Ok(rows.Select(PickupCenterTopUpController.MapToDto).ToList());
        }

        // GET /api/Admin/pickup-center-topups/{id}/screenshot
        [HttpGet("pickup-center-topups/{id}/screenshot")]
        public async Task<IActionResult> GetScreenshot(int id)
        {
            var r = await _db.PickupCenterTopUpRequests.AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new { x.ScreenshotBytes, x.ScreenshotContentType })
                .FirstOrDefaultAsync();
            if (r == null || r.ScreenshotBytes.Length == 0) return NotFound();
            return File(r.ScreenshotBytes, r.ScreenshotContentType);
        }

        // PUT /api/Admin/pickup-center-topups/{id}/status
        //   { "status": "Approved" | "Rejected", "rejectionReason": "..." }
        [HttpPut("pickup-center-topups/{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] TopUpStatusUpdateDto dto)
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
                var request = await _db.PickupCenterTopUpRequests.FirstOrDefaultAsync(r => r.Id == id);
                if (request == null)
                    return NotFound(new { message = "Top-up request not found." });

                if (request.Status != PickupCenterTopUpStatus.Pending)
                    return BadRequest(new { message = $"This request has already been {request.Status.ToString().ToLower()}." });

                if (reject)
                {
                    request.Status = PickupCenterTopUpStatus.Rejected;
                    request.ProcessedAt = DateTime.UtcNow;
                    request.ProcessedByAdminId = adminId;
                    request.RejectionReason = string.IsNullOrWhiteSpace(dto.RejectionReason)
                        ? null : dto.RejectionReason.Trim();
                    await _db.SaveChangesAsync();
                    return Ok(new { message = "Top-up rejected. Nothing was credited.", id });
                }

                // ---------- Approve: credit wallet + log transaction in ONE transaction ----------
                var strategy = _db.Database.CreateExecutionStrategy();
                decimal newBalance = 0;

                await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _db.Database.BeginTransactionAsync();
                    try
                    {
                        var now = DateTime.UtcNow;

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

                        // Money the center added itself is NOT "earned", so TotalEarned is untouched.
                        wallet.Balance += request.Amount;
                        wallet.UpdatedAt = now;

                        _db.PickupCenterWalletTransactions.Add(new PickupCenterWalletTransaction
                        {
                            PickupCenterId = request.PickupCenterId,
                            PucId = request.PucId,
                            Type = WalletTransactionType.Credit,
                            Amount = request.Amount,
                            BalanceAfter = wallet.Balance,
                            Source = "Wallet Top-up",
                            Description = $"TOP-{request.Id:D6}: UPI payment, UTR {request.UtrNumber}",
                            ReferenceId = $"topup-{request.Id}",
                            CreatedAt = now
                        });

                        request.Status = PickupCenterTopUpStatus.Approved;
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
                    message = $"Approved. ₹{request.Amount:N2} credited to the center's wallet.",
                    id,
                    credited = request.Amount,
                    walletBalance = newBalance
                });
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"[TopUp Approval Error] id={id}: {detail}");
                return StatusCode(500, new { message = $"Could not process this top-up: {detail}" });
            }
            finally
            {
                _lock.Release();
            }
        }
    }
}

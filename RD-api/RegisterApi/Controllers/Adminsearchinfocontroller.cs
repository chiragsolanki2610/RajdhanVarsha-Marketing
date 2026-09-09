using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Helpers;

namespace RegisterApi.Controllers;

/// <summary>
/// GET /api/Admin/search-user/{userId}
/// Returns a full snapshot of any user for the admin panel:
/// identity, KYC, banking, wallet balances, plans, withdrawals, recent transactions.
/// Requires Admin role JWT.
/// </summary>
[ApiController]
[Route("api/Admin")]
[Authorize(Roles = "Admin")]
public class AdminSearchInfoController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminSearchInfoController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("search-user/{userId}")]
    public async Task<IActionResult> GetUserFullInfo(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { message = "userId is required." });

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId.Trim().ToUpper());

        if (user == null)
            return NotFound(new { message = $"No user found with ID '{userId}'." });

        var kyc = await _db.KycRequests
            .AsNoTracking()
            .Where(k => k.UserId == user.UserId)
            .OrderByDescending(k => k.SubmittedAt)
            .FirstOrDefaultAsync();

        var wallets = await _db.Wallets
            .AsNoTracking()
            .Where(w => w.UserId == user.UserId)
            .OrderBy(w => w.PlanType)
            .ToListAsync();

        var plans = await _db.Plans
            .AsNoTracking()
            .Where(p => p.UserId == user.UserId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var withdrawals = await _db.WithdrawalRequests
            .AsNoTracking()
            .Where(w => w.UserId == user.UserId)
            .OrderByDescending(w => w.RequestedAt)
            .ToListAsync();

        var transactions = await _db.WalletTransactions
            .AsNoTracking()
            .Where(t => t.UserId == user.UserId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(20)
            .ToListAsync();

        var response = new AdminUserSearchResponseDto
        {
            UserId        = user.UserId,
            Name          = user.Name,
            MobileNo      = user.MobileNo,
            AadharNo      = user.AadharNo,
            Address       = user.Address,
            Password      = user.Password,
            Role          = user.Role.ToString(),
            CreatedAt     = user.CreatedAt,

            IsActive       = user.IsActive,
            IdStatus       = user.IdStatus,
            IsKycCompleted = user.IsKycCompleted,
            SelectedPlan   = user.SelectedPlan ?? string.Empty,

            SponsorId   = user.SponsorId,
            SponsorName = user.SponsorIdName,
            ParentId    = user.ParentId,
            Position    = user.Position,
            TreeLevel   = user.TreeLevel,

            TotalBV = user.BusinessVolume,

            // KYC — resolves whichever image format this particular
            // request was saved with (legacy base64 string or new byte[])
            Kyc = kyc == null ? null : new KycSummaryDto
            {
                Id                  = kyc.Id,
                FullName            = kyc.FullName,
                MobileNo            = kyc.MobileNo,
                Age                 = kyc.Age,
                Dob                 = kyc.Dob,
                Address             = kyc.Address,
                AadharNo            = kyc.AadharNo,
                PanNo               = kyc.PanNo,
                Status              = kyc.Status,
                SubmittedAt         = kyc.SubmittedAt,
                ReviewedAt          = kyc.ReviewedAt,
                RejectionReason     = kyc.RejectionReason,
                AadharFrontImageUrl = ImageResolver.ToDataUri(kyc.AadharFrontImageUrl, kyc.AadharFrontImage, kyc.AadharFrontImageContentType),
                AadharBackImageUrl  = ImageResolver.ToDataUri(kyc.AadharBackImageUrl, kyc.AadharBackImage, kyc.AadharBackImageContentType),
                PanCardImageUrl     = ImageResolver.ToDataUri(kyc.PanCardImageUrl, kyc.PanCardImage, kyc.PanCardImageContentType),
                BankProofImageUrl   = ImageResolver.ToDataUri(kyc.BankProofImageUrl, kyc.BankProofImage, kyc.BankProofImageContentType),
            },

            Banking = (!user.IsKycCompleted) ? null : new BankingDto
            {
                BankName    = user.BankName,
                AccountNo   = user.AccountNo,
                IfscCode    = user.IfscCode,
                AccountType = user.AccountType,
            },

            Wallets = wallets.Select(w => new WalletSummaryDto
            {
                PlanType       = w.PlanType,
                Balance        = w.Balance,
                TotalEarned    = w.TotalEarned,
                TotalWithdrawn = w.TotalWithdrawn,
                UpdatedAt      = w.UpdatedAt,
            }).ToList(),

            Plans = plans.Select(p => new PlanSummaryDto
            {
                Id          = p.Id,
                PlanType    = p.PlanType,
                TotalBv     = p.TotalBv,
                TotalAmount = p.TotalAmount,
                Status      = p.Status.ToString(),
                CreatedAt   = p.CreatedAt,
            }).ToList(),

            Withdrawals = withdrawals.Select(w => new WithdrawalSummaryDto
            {
                Id           = w.Id,
                PlanType     = w.PlanType,
                Amount       = w.Amount,
                Status       = w.Status.ToString(),
                RequestedAt  = w.RequestedAt,
                ProcessedAt  = w.ProcessedAt,
                AdminRemarks = w.AdminRemarks,
            }).ToList(),

            RecentTransactions = transactions.Select(t => new TransactionSummaryDto
            {
                Id           = t.Id,
                PlanType     = t.PlanType,
                Type         = t.Type.ToString(),
                Amount       = t.Amount,
                BalanceAfter = t.BalanceAfter,
                Source       = t.Source,
                Description  = t.Description,
                CreatedAt    = t.CreatedAt,
            }).ToList(),
        };

        return Ok(response);
    }

    [HttpGet("search-user")]
    public async Task<IActionResult> SearchUsers([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            return BadRequest(new { message = "query must be at least 2 characters." });

        var q = query.Trim().ToUpper();

        var users = await _db.Users
            .AsNoTracking()
            .Where(u =>
                u.UserId.Contains(q) ||
                u.Name.ToUpper().Contains(q) ||
                u.MobileNo.Contains(query) ||
                u.AadharNo.Contains(query))
            .OrderBy(u => u.UserId)
            .Take(20)
            .Select(u => new
            {
                u.UserId,
                u.Name,
                u.MobileNo,
                u.IsActive,
                u.IdStatus,
                u.IsKycCompleted,
                u.SelectedPlan,
                u.BusinessVolume,
                u.CreatedAt,
            })
            .ToListAsync();

        if (!users.Any())
            return NotFound(new { message = $"No users match '{query}'." });

        return Ok(users);
    }
}

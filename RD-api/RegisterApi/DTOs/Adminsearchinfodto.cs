using RegisterApi.Models;

namespace RegisterApi.DTOs;

// ── Full user snapshot returned by GET /api/Admin/search-user/{userId} ──────

public class AdminUserSearchResponseDto
{
    // ── Core Identity ─────────────────────────────────────────────────────
    public string UserId        { get; set; } = string.Empty;
    public string Name          { get; set; } = string.Empty;
    public string MobileNo      { get; set; } = string.Empty;
    public string AadharNo      { get; set; } = string.Empty;
    public string Address       { get; set; } = string.Empty;
    public string Password      { get; set; } = string.Empty;   // plain-text stored value
    public string Role          { get; set; } = string.Empty;
    public DateTime CreatedAt   { get; set; }

    // ── Account Status ────────────────────────────────────────────────────
    public bool   IsActive       { get; set; }
    public string IdStatus       { get; set; } = string.Empty;
    public bool   IsKycCompleted { get; set; }
    public string SelectedPlan   { get; set; } = string.Empty;

    // ── Sponsor / Tree ────────────────────────────────────────────────────
    public string? SponsorId     { get; set; }
    public string  SponsorName   { get; set; } = string.Empty;
    public string? ParentId      { get; set; }
    public string? Position      { get; set; }
    public int     TreeLevel     { get; set; }

    // ── Business Volume ───────────────────────────────────────────────────
    public int     TotalBV       { get; set; }   // from User.BusinessVolume (live counter)

    // ── KYC Details ───────────────────────────────────────────────────────
    public KycSummaryDto?  Kyc    { get; set; }

    // ── Banking (populated after KYC approval) ────────────────────────────
    public BankingDto?     Banking { get; set; }

    // ── Wallet Summary (one row per plan) ─────────────────────────────────
    public List<WalletSummaryDto> Wallets { get; set; } = new();

    // ── Plans purchased ───────────────────────────────────────────────────
    public List<PlanSummaryDto> Plans { get; set; } = new();

    // ── Withdrawal history ────────────────────────────────────────────────
    public List<WithdrawalSummaryDto> Withdrawals { get; set; } = new();

    // ── Recent wallet transactions (last 20) ──────────────────────────────
    public List<TransactionSummaryDto> RecentTransactions { get; set; } = new();
}

public class KycSummaryDto
{
    public int     Id             { get; set; }
    public string  FullName       { get; set; } = string.Empty;
    public string  MobileNo       { get; set; } = string.Empty;
    public int     Age            { get; set; }
    public string  Dob            { get; set; } = string.Empty;
    public string  Address        { get; set; } = string.Empty;
    public string  AadharNo       { get; set; } = string.Empty;
    public string  PanNo          { get; set; } = string.Empty;
    public string  Status         { get; set; } = string.Empty;
    public DateTime SubmittedAt   { get; set; }
    public DateTime? ReviewedAt   { get; set; }
    public string? RejectionReason { get; set; }

    // Document image URLs
    public string AadharFrontImageUrl { get; set; } = string.Empty;
    public string AadharBackImageUrl  { get; set; } = string.Empty;
    public string PanCardImageUrl     { get; set; } = string.Empty;
    public string BankProofImageUrl   { get; set; } = string.Empty;
}

public class BankingDto
{
    public string? BankName    { get; set; }
    public string? AccountNo   { get; set; }
    public string? IfscCode    { get; set; }
    public string? AccountType { get; set; }
}

public class WalletSummaryDto
{
    public string  PlanType        { get; set; } = string.Empty;
    public decimal Balance         { get; set; }
    public decimal TotalEarned     { get; set; }
    public decimal TotalWithdrawn  { get; set; }
    public DateTime UpdatedAt      { get; set; }
}

public class PlanSummaryDto
{
    public int     Id          { get; set; }
    public string  PlanType    { get; set; } = string.Empty;
    public decimal TotalBv     { get; set; }
    public decimal TotalAmount { get; set; }
    public string  Status      { get; set; } = string.Empty;
    public DateTime CreatedAt  { get; set; }
}

public class WithdrawalSummaryDto
{
    public int      Id           { get; set; }
    public string   PlanType     { get; set; } = string.Empty;
    public decimal  Amount       { get; set; }
    public string   Status       { get; set; } = string.Empty;
    public DateTime RequestedAt  { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string?  AdminRemarks { get; set; }
}

public class TransactionSummaryDto
{
    public int      Id           { get; set; }
    public string   PlanType     { get; set; } = string.Empty;
    public string   Type         { get; set; } = string.Empty;   // Credit / Debit
    public decimal  Amount       { get; set; }
    public decimal  BalanceAfter { get; set; }
    public string   Source       { get; set; } = string.Empty;
    public string?  Description  { get; set; }
    public DateTime CreatedAt    { get; set; }
}

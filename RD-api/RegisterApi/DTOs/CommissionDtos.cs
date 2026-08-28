using System;

namespace RegisterApi.DTOs;

/// <summary>
/// One row of "who earned you this commission and why".
/// Built by joining a WalletTransaction (in the "Dream Wallet" commission
/// bucket) back to the Plan (purchase) that triggered it via ReferenceId.
/// </summary>
public class CommissionEarningDto
{
    public int TransactionId { get; set; }

    // 0 = self purchase bonus, 1-12 = how many levels below you the buyer sits
    public int Level { get; set; }
    public decimal Percentage { get; set; }

    public decimal Amount { get; set; }          // what landed in your wallet
    public decimal PurchaseBv { get; set; }       // total BV of the purchase that triggered this
    public string PurchasePlanType { get; set; } = string.Empty; // "Dream Plan" / "Binary Plan"

    public string BuyerUserId { get; set; } = string.Empty;   // e.g. "RD0013"
    public string BuyerName { get; set; } = string.Empty;

    public string Source { get; set; } = string.Empty;       // "Level 3 Referral Bonus" etc.
    public string? Description { get; set; }
    public string? PlanId { get; set; }                       // ReferenceId, for linking back

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Aggregated summary across all commission events for the dashboard.
/// </summary>
public class CommissionSummaryDto
{
    public decimal TotalCommissionEarned { get; set; }
    public decimal SelfBonusEarned { get; set; }
    public decimal UplineBonusEarned { get; set; }
    public int TotalEarningEvents { get; set; }

    // Per-level breakdown, level 1..12 (self/level 0 excluded — shown separately above)
    public List<CommissionLevelBreakdownDto> ByLevel { get; set; } = new();
}

public class CommissionLevelBreakdownDto
{
    public int Level { get; set; }
    public decimal Percentage { get; set; }
    public decimal TotalEarned { get; set; }
    public int EventCount { get; set; }
}
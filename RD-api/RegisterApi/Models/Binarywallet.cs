using System;

namespace RegisterApi.Models;

/// <summary>
/// Separate wallet for Binary Plan earnings.
/// Distinct from the Dream Plan wallet (PlanType = "Dream Plan").
/// </summary>
public class BinaryWallet
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    public decimal Balance { get; set; } = 0;
    public decimal TotalEarned { get; set; } = 0;
    public decimal TotalWithdrawn { get; set; } = 0;

    /// <summary>How many pair events this user has completed total</summary>
    public int PairsCount { get; set; } = 0;

    /// <summary>
    /// True when user has ≥3 downline members in their binary tree
    /// (combination can be 2L+1R or 1L+2R).
    /// First withdrawal is only allowed when this is true.
    /// </summary>
    public bool WithdrawalUnlocked { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum BinaryTxnType
{
    Credit,
    Debit
}

public class BinaryWalletTransaction
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    public BinaryTxnType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }

    /// <summary>e.g. "Pair Commission", "Withdrawal"</summary>
    public string Source { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>BinaryPairs.Id or withdrawal request Id</summary>
    public string? ReferenceId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Withdrawal request against a user's BinaryWallet.
/// Admin approves/rejects from the admin panel.
/// </summary>
public class BinaryWithdrawalRequest
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public decimal Amount { get; set; }

    /// <summary>"Pending" | "Approved" | "Rejected"</summary>
    public string Status { get; set; } = "Pending";

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? AdminNote { get; set; }
}
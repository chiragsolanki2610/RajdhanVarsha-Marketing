using System;

namespace RegisterApi.Models;

public enum WalletTransactionType
{
    Credit = 0,
    Debit = 1
}

public class WalletTransaction
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string PlanType { get; set; } = string.Empty;

    public WalletTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }   // wallet balance right after this transaction

    // e.g. "Referral Bonus", "BV Matching", "Withdrawal Request", "Withdrawal Rejected"
    public string Source { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Optional link, e.g. to a WithdrawalRequest.Id
    public string? ReferenceId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
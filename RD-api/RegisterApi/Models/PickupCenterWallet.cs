using System;

namespace RegisterApi.Models;

// Wallet that belongs to a pickup center (separate from the member Wallet table,
// which is keyed by UserId + PlanType).
public class PickupCenterWallet
{
    public int Id { get; set; }
    public int PickupCenterId { get; set; }           // FK -> PickupCenter.Id (unique)
    public string PucId { get; set; } = string.Empty;

    public decimal Balance { get; set; } = 0;
    public decimal TotalEarned { get; set; } = 0;
    public decimal TotalWithdrawn { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class PickupCenterWalletTransaction
{
    public int Id { get; set; }
    public int PickupCenterId { get; set; }
    public string PucId { get; set; } = string.Empty;

    public WalletTransactionType Type { get; set; }   // reuses Credit / Debit enum
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }

    public string Source { get; set; } = string.Empty;   // e.g. "Stock Return"
    public string? Description { get; set; }
    public string? ReferenceId { get; set; }             // e.g. "return-12"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

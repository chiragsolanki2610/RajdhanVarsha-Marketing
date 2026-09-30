using System;

namespace RegisterApi.Models;

public enum WithdrawalStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public class WithdrawalRequest
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string PlanType { get; set; } = string.Empty;

    public decimal Amount { get; set; }                  // gross amount requested by the user

    // --- Tax breakdown (5% Service Tax + 5% TDS deducted from Amount) ---
    public decimal ServiceTaxAmount { get; set; } = 0;
    public decimal TdsAmount { get; set; } = 0;
    public decimal NetPayableAmount { get; set; } = 0;    // Amount - ServiceTaxAmount - TdsAmount (what is actually paid out)

    public WithdrawalStatus Status { get; set; } = WithdrawalStatus.Pending;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedByAdminId { get; set; }   // Admin's UserId
    public string? AdminRemarks { get; set; }
}
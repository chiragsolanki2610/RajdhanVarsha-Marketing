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

    public decimal Amount { get; set; }
    public WithdrawalStatus Status { get; set; } = WithdrawalStatus.Pending;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedByAdminId { get; set; }   // Admin's UserId
    public string? AdminRemarks { get; set; }
}
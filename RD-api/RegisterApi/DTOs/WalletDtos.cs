using System;

namespace RegisterApi.DTOs;

public class WalletDto
{
    public string PlanType { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal TotalEarned { get; set; }
    public decimal TotalWithdrawn { get; set; }
    public decimal MinWithdrawalAmount { get; set; }
}

public class WalletTransactionDto
{
    public int Id { get; set; }
    public string PlanType { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "Credit" / "Debit"
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RequestWithdrawalDto
{
    public string PlanType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class WithdrawalRequestDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string PlanType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? AdminRemarks { get; set; }
}

public class ProcessWithdrawalDto
{
    public string? AdminRemarks { get; set; }
}
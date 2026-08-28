using System;
using System.Collections.Generic;

namespace RegisterApi.Models;

// Stores the per-plan min withdrawal rule. Add an entry here if you ever
// introduce a 3rd plan with a different minimum.
public static class WalletRules
{
    public const decimal DefaultMinWithdrawal = 250m;

    private static readonly Dictionary<string, decimal> MinWithdrawalByPlan = new()
    {
        { "Dream Plan", 250m },
        { "Binary Plan", 0m },
    };

    public static decimal GetMinWithdrawal(string planType)
        => MinWithdrawalByPlan.TryGetValue(planType, out var min) ? min : DefaultMinWithdrawal;

    // --- Withdrawal taxes (applied to both Dream Plan and Binary Plan) ---
    public const decimal ServiceTaxPercent = 5m;
    public const decimal TdsPercent = 5m;

    public static (decimal ServiceTax, decimal Tds, decimal NetPayable) CalculateWithdrawalTax(decimal amount)
    {
        var serviceTax = Math.Round(amount * ServiceTaxPercent / 100m, 2);
        var tds = Math.Round(amount * TdsPercent / 100m, 2);
        var netPayable = amount - serviceTax - tds;
        return (serviceTax, tds, netPayable);
    }
}

public class Wallet
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;   // FK -> User.UserId (e.g. RD0001)
    public string PlanType { get; set; } = string.Empty; // "Dream Plan", "Binary Plan" - matches Plan.PlanType

    public decimal Balance { get; set; } = 0;        // currently available to withdraw
    public decimal TotalEarned { get; set; } = 0;     // lifetime credits
    public decimal TotalWithdrawn { get; set; } = 0;   // lifetime approved withdrawals

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
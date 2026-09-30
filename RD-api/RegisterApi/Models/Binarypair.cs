using System;

namespace RegisterApi.Models;

/// <summary>
/// Created when both LEFT and RIGHT child slots under a user get filled.
/// Each pair earns the parent user ₹150 commission credited to BinaryWallet.
/// </summary>
public class BinaryPair
{
    public int Id { get; set; }

    /// <summary>User who earned the ₹150 pair commission</summary>
    public string UserId { get; set; } = string.Empty;

    public string LeftChildId { get; set; } = string.Empty;
    public string RightChildId { get; set; } = string.Empty;

    /// <summary>Always ₹150 per the Binary Plan rules</summary>
    public decimal CommissionAmt { get; set; } = 150m;

    public DateTime CreditedAt { get; set; } = DateTime.UtcNow;
}
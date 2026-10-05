using System;

namespace RegisterApi.Models;

public enum PickupCenterReturnStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

// Pickup center asks to send stock it holds back to the company.
// Prices are SNAPSHOTTED at request time (ItemsJson) so a later DP change
// can't alter what the center is credited when admin approves.
//
//  Approved -> items leave PickupCenterInventoryItems, go back to Product.Quantity,
//              and CreditAmount is credited to the center's wallet.
//  Rejected -> nothing changes. Center just sees "Rejected".
public class PickupCenterReturnRequest
{
    public int Id { get; set; }

    public int PickupCenterId { get; set; }          // FK -> PickupCenter.Id
    public string PucId { get; set; } = string.Empty;
    public string CenterName { get; set; } = string.Empty;

    // [{ productId, productNo, productName, quantity, dp }]
    public string ItemsJson { get; set; } = "[]";

    public decimal SubTotalDp { get; set; }          // sum(dp * qty) — the "actual total"
    public decimal DeductionPercent { get; set; }    // 6
    public decimal DeductionAmount { get; set; }
    public decimal CreditAmount { get; set; }        // SubTotalDp - DeductionAmount -> wallet

    public string? Reason { get; set; }              // optional note from the center

    public PickupCenterReturnStatus Status { get; set; } = PickupCenterReturnStatus.Pending;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedByAdminId { get; set; }
    public string? RejectionReason { get; set; }
}

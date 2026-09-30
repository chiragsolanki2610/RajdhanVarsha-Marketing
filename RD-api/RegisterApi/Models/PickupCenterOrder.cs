using System;

namespace RegisterApi.Models;

public enum PickupCenterOrderStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2
}

// A pickup center's request to buy product stock from the company.
// Paid via UPI (UTR + screenshot), same pattern as the normal-user PaymentOrder.
// On admin acceptance, ItemsJson quantities are added to that pickup center's
// own inventory (PickupCenterInventoryItem) and deducted from the company's
// Product.Quantity.
public class PickupCenterOrder
{
    public int Id { get; set; }

    public int PickupCenterId { get; set; }     // FK -> PickupCenter.Id
    public string PucId { get; set; } = string.Empty;
    public string CenterName { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;

    public string UtrNumber { get; set; } = string.Empty;
    public string? ScreenshotUrl { get; set; }   // data:image/...;base64,... (same as PaymentOrder)

    // Serialized list of { productId, productName, quantity, dp, bv } — snapshot at order time
    public string ItemsJson { get; set; } = "[]";

    public decimal SubTotalDp { get; set; }      // total DP before discount
    public decimal DiscountPercent { get; set; } // 6 if SubTotalDp >= 15000, else 0
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }     // amount actually payable/paid (after discount)
    public decimal TotalBv { get; set; }

    public PickupCenterOrderStatus Status { get; set; } = PickupCenterOrderStatus.Pending;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedByAdminId { get; set; }
    public string? RejectionReason { get; set; }
}

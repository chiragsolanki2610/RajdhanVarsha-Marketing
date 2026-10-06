using System;

namespace RegisterApi.Models;

public enum PickupCenterTopUpStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

// Pickup center pays the company by UPI, then submits the amount + UTR + screenshot.
//   Approved -> Amount is credited to the center's PickupCenterWallet.
//   Rejected -> nothing is credited; the center sees the rejection reason.
public class PickupCenterTopUpRequest
{
    public int Id { get; set; }

    public int PickupCenterId { get; set; }
    public string PucId { get; set; } = string.Empty;
    public string CenterName { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public string UtrNumber { get; set; } = string.Empty;

    // Stored in the DB (same approach as KYC images) so it survives Render redeploys.
    public byte[] ScreenshotBytes { get; set; } = Array.Empty<byte>();
    public string ScreenshotContentType { get; set; } = "image/jpeg";

    public PickupCenterTopUpStatus Status { get; set; } = PickupCenterTopUpStatus.Pending;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedByAdminId { get; set; }
    public string? RejectionReason { get; set; }
}

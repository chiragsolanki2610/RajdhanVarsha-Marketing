using System;

namespace RegisterApi.Models;

public enum PaymentOrderStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public class PaymentOrder
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;       // e.g. RD0001
    public string UtrNumber { get; set; } = string.Empty;    // 12-digit UTR
    public string? ScreenshotUrl { get; set; }               // Supabase Storage URL
    public decimal TotalAmount { get; set; }
    public decimal TotalBv { get; set; }
    public string CartItemsJson { get; set; } = "[]";        // serialized cart
    public PaymentOrderStatus Status { get; set; } = PaymentOrderStatus.Pending;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedByAdminId { get; set; }
    public string? AdminRemarks { get; set; }

    // Receipt draft — auto-populated on approval, editable by admin before finalizing.
    // Stored separately from CartItemsJson/TotalAmount/TotalBv so admin edits never
    // touch the original order data — only what's shown on the receipt.
    public string? ReceiptItemsJson { get; set; }      // normalized, editable line items
    public decimal? ReceiptTotalAmount { get; set; }    // editable total shown on receipt
    public decimal? ReceiptTotalBv { get; set; }        // editable BV shown on receipt
    public string? ReceiptNotes { get; set; }           // editable note shown on receipt

    public byte[]? ReceiptPdf { get; set; }             // latest generated PDF (draft or final)
    public DateTime? ReceiptGeneratedAt { get; set; }

    // Only once this is true does the receipt become visible/downloadable to the user
    public bool ReceiptFinalized { get; set; } = false;
    public DateTime? ReceiptFinalizedAt { get; set; }
}
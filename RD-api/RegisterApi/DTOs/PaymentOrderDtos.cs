using Microsoft.AspNetCore.Http;

namespace RegisterApi.DTOs;

// ── Returned to client / admin ────────────────────────────────────────────────
public class PaymentOrderDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UtrNumber { get; set; } = string.Empty;
    public string? ScreenshotUrl { get; set; }
    public string PlanType { get; set; } = "Dream Plan";
    public decimal TotalAmount { get; set; }
    public decimal TotalBv { get; set; }
    public string CartItemsJson { get; set; } = "[]";
    public string Status { get; set; } = string.Empty;   // "Pending" | "Approved" | "Rejected"
    public DateTime RequestedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? AdminRemarks { get; set; }

    // true once the admin has finalized the receipt — only then can the USER see/download it
    public bool ReceiptAvailable { get; set; }

    // true once a draft PDF exists for ADMIN to preview/edit, regardless of finalize state
    public bool ReceiptDraftReady { get; set; }
}

// ── Admin approve / reject body ───────────────────────────────────────────────
public class ProcessPaymentOrderDto
{
    public string? AdminRemarks { get; set; }
}

// ── multipart/form-data from the payment page ─────────────────────────────────
public class SubmitPaymentFormDto
{
    public string? Utr { get; set; }
    public IFormFile? Screenshot { get; set; }

    // "Dream Plan" or "Binary Plan". Defaults to "Dream Plan" if the
    // client doesn't send it (keeps old frontend calls working).
    public string? PlanType { get; set; }

    public string? TotalAmount { get; set; }
    public string? TotalBv { get; set; }
    public string? CartItems { get; set; }   // JSON string
}

// ── Parsed shape of one entry in dto.CartItems ("[{productId, quantity, dp, bv}]") ──
// Only ProductId/Quantity are trusted — Dp/Bv on this DTO are ignored; the real
// values are looked up fresh from the Products table server-side.
public class CartItemSubmissionDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

// ── Receipt draft review / edit (admin only) ───────────────────────────────────
public class ReceiptItemDto
{
    public string Name { get; set; } = string.Empty;
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
}

// GET .../receipt/draft response — what the admin sees to review/edit
public class ReceiptDraftDto
{
    public int OrderId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public List<ReceiptItemDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public decimal TotalBv { get; set; }
    public string? Notes { get; set; }
    public bool ReceiptFinalized { get; set; }
    public DateTime? ReceiptFinalizedAt { get; set; }
}

// PUT .../receipt/draft body — admin's edits
public class UpdateReceiptDraftDto
{
    public List<ReceiptItemDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public decimal TotalBv { get; set; }
    public string? Notes { get; set; }
}
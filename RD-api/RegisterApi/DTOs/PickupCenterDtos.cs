using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;

namespace RegisterApi.DTOs
{
    // ---- Public: Apply ----
    public class PickupCenterApplyDto
    {
        [Required] public string Username { get; set; } = string.Empty;
        [Required] public string Password { get; set; } = string.Empty;
        [Required] public string Phone { get; set; } = string.Empty;

        [Required] public string FullName { get; set; } = string.Empty;

        public string? SponsorId { get; set; }
        public string? SponsorName { get; set; }

        [Required] public string AadharNumber { get; set; } = string.Empty;
        public string? AadharImageBase64 { get; set; }

        [Required] public string PanNumber { get; set; } = string.Empty;
        public string? PanImageBase64 { get; set; }

        [Required] public string AccountNumber { get; set; } = string.Empty;
        [Required] public string IfscCode { get; set; } = string.Empty;
        public string? PassbookImageBase64 { get; set; }

        [Required] public string CenterName { get; set; } = string.Empty;
        [Required] public string CenterAddress { get; set; } = string.Empty;
    }

    // ---- Public: Login ----
    public class PickupCenterLoginDto
    {
        [Required] public string Username { get; set; } = string.Empty;
        [Required] public string Password { get; set; } = string.Empty;
    }

    public class PickupCenterLoginResponseDto
    {
        public string PucId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string CenterName { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }

    // ---- Admin: review a request ----
    public class PickupCenterStatusUpdateDto
    {
        [Required] public string Status { get; set; } = string.Empty; // "Approved" | "Rejected"
        public string? RejectionReason { get; set; }
    }

    // =========================================================================
    // Pickup Center buying stock from the company ("Buy from Company" -> pay)
    // =========================================================================

    // One line the pickup center added to their purchase cart
    public class PickupCenterOrderItemSubmissionDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    // multipart/form-data body for POST /api/PickupCenter/orders
    public class SubmitPickupCenterOrderFormDto
    {
        public string? Utr { get; set; }
        public IFormFile? Screenshot { get; set; }
        public string? Items { get; set; }         // JSON string of PickupCenterOrderItemSubmissionDto[]
        public string? TotalAmount { get; set; }    // client-computed, cross-checked against server total
    }

    // One line item as shown back to the pickup center / admin
    public class PickupCenterOrderItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Dp { get; set; }
        public decimal Bv { get; set; }
        public decimal LineTotal { get; set; }
    }

    // GET response for both the pickup center's own order history and admin's list/detail
    public class PickupCenterOrderDto
    {
        public int Id { get; set; }
        public string PucId { get; set; } = string.Empty;
        public string CenterName { get; set; } = string.Empty;
        public string ContactName { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;

        public List<PickupCenterOrderItemDto> Items { get; set; } = new();

        public decimal SubTotalDp { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalBv { get; set; }

        public string UtrNumber { get; set; } = string.Empty;
        public string? ScreenshotUrl { get; set; }

        public string Status { get; set; } = string.Empty; // "Pending" | "Accepted" | "Rejected"
        public DateTime RequestedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    // PUT /api/Admin/pickup-center-orders/{id}/status body
    public class PickupCenterOrderStatusUpdateDto
    {
        [Required] public string Status { get; set; } = string.Empty; // "Accepted" | "Rejected"
        public string? RejectionReason { get; set; }
    }

    // GET /api/PickupCenter/inventory — one row of "My Stock"
    public class PickupCenterInventoryItemDto
    {
        public int ProductId { get; set; }
        public string ProductNo { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public decimal Dp { get; set; }
        public decimal Bv { get; set; }
        public decimal Mrp { get; set; }
        public int Quantity { get; set; }
    }

    // POST /api/PickupCenter/Sell body — one line item the operator added to the cart
    public class PucSaleItemDto
    {
        [Required] public int ProductId { get; set; }
        [Required] public int Quantity { get; set; }
    }

    // POST /api/PickupCenter/Sell body
    public class PucSaleRequestDto
    {
        [Required] public string UserId { get; set; } = string.Empty;   // the customer's member/user ID, e.g. RD0002
        [Required] public string PaymentMethod { get; set; } = "cash";  // "cash" | "upi" | "wallet" — informational only for now
        [Required] public List<PucSaleItemDto> Items { get; set; } = new();
    }

    // POST /api/PickupCenter/Sell response
    public class PucSaleResultDto
    {
        public int OrderId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TotalBv { get; set; }
        public bool ReceiptAvailable { get; set; }
    }
}
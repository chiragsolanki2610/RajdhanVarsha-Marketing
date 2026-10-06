using System.ComponentModel.DataAnnotations;

namespace RegisterApi.DTOs
{
    // multipart/form-data body for POST /api/PickupCenter/topups
    public class SubmitTopUpForm
    {
        [Required] public decimal Amount { get; set; }
        [Required] public string UtrNumber { get; set; } = string.Empty;
        public IFormFile? Screenshot { get; set; }
    }

    public class TopUpPaymentInfoDto
    {
        public string UpiId { get; set; } = string.Empty;
        public string PayeeName { get; set; } = string.Empty;
        public decimal MinAmount { get; set; }
        public decimal MaxAmount { get; set; }
    }

    public class TopUpDto
    {
        public int Id { get; set; }
        public string RequestNo { get; set; } = string.Empty;   // TOP-000012
        public string PucId { get; set; } = string.Empty;
        public string CenterName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string UtrNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;      // Pending | Approved | Rejected
        public DateTime RequestedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    // PUT /api/Admin/pickup-center-topups/{id}/status
    public class TopUpStatusUpdateDto
    {
        [Required] public string Status { get; set; } = string.Empty; // "Approved" | "Rejected"
        public string? RejectionReason { get; set; }
    }
}

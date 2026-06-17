using System;
using System.ComponentModel.DataAnnotations;

namespace RegisterApi.Models
{
    public class KycRequest
    {
        [Key]
        public int Id { get; set; }

        // Linked to your existing user — store the userId from JWT token
        [Required]
        public string UserId { get; set; } = string.Empty;

        // Personal Details
        [Required]
        public string FullName { get; set; } = string.Empty;
        public string MobileNo { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Dob { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;

        // Identity Documents
        [Required]
        public string AadharNo { get; set; } = string.Empty;
        [Required]
        public string PanNo { get; set; } = string.Empty;

        // Bank Details
        [Required]
        public string AccountHolderName { get; set; } = string.Empty;
        [Required]
        public string AccountNo { get; set; } = string.Empty;
        [Required]
        public string BankName { get; set; } = string.Empty;
        [Required]
        public string IfscCode { get; set; } = string.Empty;

        // Supabase Storage URLs (uploaded by frontend before calling this API)
        public string AadharFrontImageUrl { get; set; } = string.Empty;
        public string AadharBackImageUrl { get; set; } = string.Empty;
        public string PanCardImageUrl { get; set; } = string.Empty;
        public string BankProofImageUrl { get; set; } = string.Empty;

        // Status: Pending | Approved | Rejected
        public string Status { get; set; } = "Pending";

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public string? RejectionReason { get; set; }
    }
}
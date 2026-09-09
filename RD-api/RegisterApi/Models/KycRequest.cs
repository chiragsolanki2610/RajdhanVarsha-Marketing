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

        // LEGACY: old submissions stored these as base64 data-URI strings.
        // Kept here, untouched, so existing records still resolve correctly.
        public string? AadharFrontImageUrl { get; set; }
        public string? AadharBackImageUrl { get; set; }
        public string? PanCardImageUrl { get; set; }
        public string? BankProofImageUrl { get; set; }

        // NEW: submissions from the updated multipart flow store raw bytes here.
        public byte[]? AadharFrontImage { get; set; }
        public string? AadharFrontImageContentType { get; set; }

        public byte[]? AadharBackImage { get; set; }
        public string? AadharBackImageContentType { get; set; }

        public byte[]? PanCardImage { get; set; }
        public string? PanCardImageContentType { get; set; }

        public byte[]? BankProofImage { get; set; }
        public string? BankProofImageContentType { get; set; }

        // Status: Pending | Approved | Rejected
        public string Status { get; set; } = "Pending";
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public string? RejectionReason { get; set; }
    }
}

using System;
using System.ComponentModel.DataAnnotations;

namespace RegisterApi.Models
{
    public class PickupCenterRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public string Phone { get; set; } = string.Empty;

        // Personal Details
        [Required]
        public string FullName { get; set; } = string.Empty;

        // Sponsor / referral details (optional)
        public string? SponsorId { get; set; }
        public string? SponsorName { get; set; }

        // Identity Documents
        [Required]
        public string AadharNumber { get; set; } = string.Empty;
        public string? AadharImageBase64 { get; set; }

        [Required]
        public string PanNumber { get; set; } = string.Empty;
        public string? PanImageBase64 { get; set; }

        // Bank Account Details
        [Required]
        public string AccountNumber { get; set; } = string.Empty;
        [Required]
        public string IfscCode { get; set; } = string.Empty;
        public string? PassbookImageBase64 { get; set; }

        // Pickup Center Details
        [Required]
        public string CenterName { get; set; } = string.Empty;
        [Required]
        public string CenterAddress { get; set; } = string.Empty;

        public string Status { get; set; } = "Pending";

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public string? RejectionReason { get; set; }

        public string? GeneratedPucId { get; set; }
    }
}
using System;
using System.ComponentModel.DataAnnotations;

namespace RegisterApi.Models
{
    public class PickupCenter
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string PucId { get; set; } = string.Empty;

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
        public string AadharNumber { get; set; } = string.Empty;
        public string? AadharImageBase64 { get; set; }
        public string PanNumber { get; set; } = string.Empty;
        public string? PanImageBase64 { get; set; }

        // Bank Account Details
        public string AccountNumber { get; set; } = string.Empty;
        public string IfscCode { get; set; } = string.Empty;
        public string? PassbookImageBase64 { get; set; }

        // Pickup Center Details
        public string CenterName { get; set; } = string.Empty;
        public string CenterAddress { get; set; } = string.Empty;

        public string Status { get; set; } = "Active";

        public int SourceRequestId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? ApprovedBy { get; set; }
    }
}
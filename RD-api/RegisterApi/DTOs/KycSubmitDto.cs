using System.ComponentModel.DataAnnotations;

namespace RegisterApi.Models
{
    // This is what the frontend sends to POST /api/Kyc/submit
    public class KycSubmitDto
    {
        [Required] public string FullName { get; set; } = string.Empty;
        [Required] public string MobileNo { get; set; } = string.Empty;
        [Required] public int Age { get; set; }
        [Required] public string Dob { get; set; } = string.Empty;
        [Required] public string Address { get; set; } = string.Empty;

        [Required] public string AadharNo { get; set; } = string.Empty;
        [Required] public string PanNo { get; set; } = string.Empty;

        [Required] public string AccountHolderName { get; set; } = string.Empty;
        [Required] public string AccountNo { get; set; } = string.Empty;
        [Required] public string BankName { get; set; } = string.Empty;
        [Required] public string IfscCode { get; set; } = string.Empty;

        // These are Supabase public URLs — frontend uploads files to Supabase first, then sends URLs here
        [Required] public string AadharFrontImageUrl { get; set; } = string.Empty;
        [Required] public string AadharBackImageUrl { get; set; } = string.Empty;
        [Required] public string PanCardImageUrl { get; set; } = string.Empty;
        [Required] public string BankProofImageUrl { get; set; } = string.Empty;
    }

    // For PUT /api/Admin/kyc-requests/{id}/status
    public class KycStatusUpdateDto
    {
        [Required] public string Status { get; set; } = string.Empty; // "Approved" or "Rejected"
        public string? RejectionReason { get; set; }
    }
}
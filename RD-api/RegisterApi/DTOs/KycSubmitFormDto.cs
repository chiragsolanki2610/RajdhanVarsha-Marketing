using Microsoft.AspNetCore.Http;

namespace RegisterApi.DTOs
{
    // Used by UserKycController.SubmitKyc with [FromForm] for multipart/form-data
    // requests. Field names must exactly match the FormData keys sent from
    // page.tsx (case-sensitive by convention, though model binding is
    // case-insensitive in ASP.NET Core).
    public class KycSubmitFormDto
    {
        public string FullName { get; set; } = string.Empty;
        public string MobileNo { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Dob { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string AadharNo { get; set; } = string.Empty;
        public string PanNo { get; set; } = string.Empty;
        public string AccountHolderName { get; set; } = string.Empty;
        public string AccountNo { get; set; } = string.Empty;
        public string BankName { get; set; } = string.Empty;
        public string IfscCode { get; set; } = string.Empty;
        public bool IsKycCompleted { get; set; }

        public IFormFile? AadharFrontImage { get; set; }
        public IFormFile? AadharBackImage { get; set; }
        public IFormFile? PanCardImage { get; set; }
        public IFormFile? BankProofImage { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace RegisterApi.DTOs
{
    public class PlanManagerSetSponsorDto
    {
        [Required] public string UserId { get; set; } = string.Empty;
        [Required] public string SponsorId { get; set; } = string.Empty;
        [Required] public string PlanType { get; set; } = string.Empty; // "Dream Plan" | "Binary Plan"
        public string? PreferredPosition { get; set; } = "LEFT";        // only used for Binary Plan
    }

    public class PlanManagerActivateItemDto
    {
        [Required] public int ProductId { get; set; }
        [Required] public int Quantity { get; set; }
    }

    public class PlanManagerActivateDto
    {
        [Required] public string UserId { get; set; } = string.Empty;
        [Required] public string PlanType { get; set; } = string.Empty; // "Dream Plan" | "Binary Plan"
        [Required] public string PaymentMethod { get; set; } = "cash";  // cash | upi
        [Required] public List<PlanManagerActivateItemDto> Items { get; set; } = new();
    }
}

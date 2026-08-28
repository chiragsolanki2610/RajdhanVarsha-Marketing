namespace RegisterApi.DTOs;

public class PlanCheckoutItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class PlanCheckoutDto
{
    public string PlanType { get; set; } = string.Empty; // "Dream Plan" / "Binary Plan"
    public List<PlanCheckoutItemDto> Items { get; set; } = new();
}
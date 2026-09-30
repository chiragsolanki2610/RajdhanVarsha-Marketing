namespace RegisterApi.Models;

public class PlanItem
{
    public int Id { get; set; }
    public int PlanId { get; set; }
    public Plan? Plan { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    public int Quantity { get; set; }
    public decimal Bv { get; set; }   // snapshot of product BV at purchase time
    public decimal Mrp { get; set; }  // snapshot of product price at purchase time
}
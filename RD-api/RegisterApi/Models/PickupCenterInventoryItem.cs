using System;

namespace RegisterApi.Models;

// One row per (PickupCenter, Product) — the stock that center currently holds,
// after buying it from the company. Increased only when an admin accepts a
// PickupCenterOrder containing that product.
public class PickupCenterInventoryItem
{
    public int Id { get; set; }

    public int PickupCenterId { get; set; }   // FK -> PickupCenter.Id
    public int ProductId { get; set; }        // FK -> Product.Id

    public int Quantity { get; set; } = 0;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

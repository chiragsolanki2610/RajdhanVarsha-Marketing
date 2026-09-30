using System.ComponentModel.DataAnnotations;

namespace RegisterApi.DTOs
{
    public class CreateProductDto
    {
        [Required]
        public string ProductNo { get; set; } = string.Empty;

        [Required]
        public string ProductName { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Mrp { get; set; }

        [Required]
        [Range(0, 100)]
        public decimal Gst { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Dp { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Bv { get; set; }

        // Initial stock when the product is created. Defaults to 0 if omitted.
        [Range(0, int.MaxValue)]
        public int Quantity { get; set; } = 0;

        public IFormFile? Image { get; set; }
    }

    public class ProductStatusDto
    {
        [Required]
        public bool IsActive { get; set; }
    }

    // ── PUT /api/Products/{id}/add-stock body ──────────────────────────────
    // Quantity is a DELTA added to the current stock (e.g. 50 means "+50 units").
    // Use a negative number to manually correct stock downward (e.g. damaged goods).
    public class AddStockDto
    {
        [Required]
        public int Quantity { get; set; }
    }
}
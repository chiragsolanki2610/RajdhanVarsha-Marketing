using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RegisterApi.Models
{
    public class Product
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ProductNo { get; set; } = string.Empty;

        [Required]
        public string ProductName { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Mrp { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal Gst { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Dp { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Bv { get; set; }

        // Current stock on hand. Increased via admin "add stock", decreased
        // automatically when an order containing this product is approved.
        public int Quantity { get; set; } = 0;

        // Public URL from Supabase Storage bucket "products"
        public string ImageUrl { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
        public string AddedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
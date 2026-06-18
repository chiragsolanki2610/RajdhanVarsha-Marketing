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

        public IFormFile? Image { get; set; }
    }

    public class ProductStatusDto
    {
        [Required]
        public bool IsActive { get; set; }
    }
}
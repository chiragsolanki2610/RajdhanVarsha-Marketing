using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.CodeAnalysis;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/Products")]
    public class ProductController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public ProductController(AppDbContext db, IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _db = db;
            _config = config;
            _httpClient = httpClientFactory.CreateClient();
        }

        // ── POST /api/Products ─────────────────────────────────────────────────
        // Admin only — add a new product, uploads image to Supabase Storage
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> AddProduct([FromForm] CreateProductDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 1. Check ProductNo is unique
            var exists = await _db.Products.AnyAsync(p => p.ProductNo == dto.ProductNo);
            if (exists)
                return Conflict(new { message = $"Product number '{dto.ProductNo}' already exists." });

            // 2. Upload image to Supabase Storage via REST API
            string imageUrl = string.Empty;
            if (dto.Image != null && dto.Image.Length > 0)
            {
                var supabaseUrl = _config["Supabase:Url"];   // https://tojcysqttbbcnvvapkoi.supabase.co
                var supabaseKey = _config["Supabase:Key"];   // your publishable key
                const string bucketName = "products";

                var fileExt = Path.GetExtension(dto.Image.FileName);
                var fileName = $"{dto.ProductNo}_{Guid.NewGuid()}{fileExt}";
                var uploadUrl = $"{supabaseUrl}/storage/v1/object/{bucketName}/{fileName}";

                using var ms = new MemoryStream();
                await dto.Image.CopyToAsync(ms);
                var fileBytes = ms.ToArray();

                using var content = new ByteArrayContent(fileBytes);
                content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                    dto.Image.ContentType ?? "application/octet-stream"
                );

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("apikey", supabaseKey);
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                var response = await _httpClient.PostAsync(uploadUrl, content);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    return StatusCode(500, new { message = "Image upload failed.", detail = error });
                }

                // Public URL — bucket must be set to Public in Supabase dashboard
                imageUrl = $"{supabaseUrl}/storage/v1/object/public/{bucketName}/{fileName}";
            }

            // 3. Get admin userId from JWT
            var adminUserId = User.FindFirst("userId")?.Value
                           ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? "unknown";

            // 4. Save product to Supabase Postgres via EF Core
            var product = new Product
            {
                ProductNo = dto.ProductNo.Trim(),
                ProductName = dto.ProductName.Trim(),
                Category = dto.Category.Trim(),
                Description = dto.Description.Trim(),
                Mrp = dto.Mrp,
                Gst = dto.Gst,
                Dp = dto.Dp,
                Bv = dto.Bv,
                ImageUrl = imageUrl,
                IsActive = true,
                AddedBy = adminUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _db.Products.Add(product);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Product added successfully.",
                product = new
                {
                    product.Id,
                    product.ProductNo,
                    product.ProductName,
                    product.Category,
                    product.Description,
                    product.Mrp,
                    product.Gst,
                    product.Dp,
                    product.Bv,
                    product.ImageUrl,
                    product.IsActive,
                    product.CreatedAt
                }
            });
        }

        // ── GET /api/Products ──────────────────────────────────────────────────
        // Public — get all active products (shop page)
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllProducts([FromQuery] string? category = null)
        {
            var query = _db.Products.Where(p => p.IsActive).AsQueryable();

            if (!string.IsNullOrEmpty(category))
                query = query.Where(p => p.Category == category);

            var products = await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.ProductNo,
                    p.ProductName,
                    p.Category,
                    p.Description,
                    p.Mrp,
                    p.Gst,
                    p.Dp,
                    p.Bv,
                    p.ImageUrl,
                    p.CreatedAt
                })
                .ToListAsync();

            return Ok(products);
        }

        // ── GET /api/Products/{id} ─────────────────────────────────────────────
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null)
                return NotFound(new { message = "Product not found." });

            return Ok(product);
        }

        // ── PUT /api/Products/{id}/toggle-status ──────────────────────────────
        // Admin only — activate or deactivate
        [HttpPut("{id}/toggle-status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleStatus(int id, [FromBody] ProductStatusDto dto)
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null)
                return NotFound(new { message = "Product not found." });

            product.IsActive = dto.IsActive;
            product.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = $"Product {(dto.IsActive ? "activated" : "deactivated")} successfully.",
                id = product.Id,
                isActive = product.IsActive
            });
        }

        // ── DELETE /api/Products/{id} ─────────────────────────────────────────
        // Admin only — permanently delete
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null)
                return NotFound(new { message = "Product not found." });

            _db.Products.Remove(product);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Product deleted successfully.", id });
        }
    }
}
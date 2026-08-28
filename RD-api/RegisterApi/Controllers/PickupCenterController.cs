using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Services;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/PickupCenter")]
    public class PickupCenterController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPasswordService _passwordService;
        private readonly IConfiguration _config;
        private readonly IReceiptService _receiptService;
        private readonly ICommissionService _commissionService;

        // Minimum order value (in DP) required to place a stock order, and the
        // flat discount % applied once that minimum is met.
        private const decimal MinOrderDp = 15000m;
        private const decimal DiscountPercentAtMin = 6m;

        public PickupCenterController(
            AppDbContext db,
            IPasswordService passwordService,
            IConfiguration config,
            IReceiptService receiptService,
            ICommissionService commissionService)
        {
            _db = db;
            _passwordService = passwordService;
            _config = config;
            _receiptService = receiptService;
            _commissionService = commissionService;
        }

        // ── Helper: get logged-in pickup center's PucId from JWT ──
        private string CurrentPucId =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("PucId claim missing from token.");

        // POST /api/PickupCenter/apply
        [HttpPost("apply")]
        [AllowAnonymous]
        public async Task<IActionResult> Apply([FromBody] PickupCenterApplyDto dto)
        {
            var username = dto.Username.Trim();

            bool takenByCenter = await _db.PickupCenters.AnyAsync(p => p.Username == username);
            bool takenByPendingRequest = await _db.PickupCenterRequests
                .AnyAsync(r => r.Username == username && r.Status == "Pending");

            if (takenByCenter || takenByPendingRequest)
                return Conflict(new { message = "This username is already in use. Please choose another." });

            var request = new PickupCenterRequest
            {
                Username = username,
                PasswordHash = _passwordService.HashPassword(dto.Password),
                Phone = dto.Phone.Trim(),
                FullName = dto.FullName.Trim(),
                SponsorId = string.IsNullOrWhiteSpace(dto.SponsorId) ? null : dto.SponsorId.Trim(),
                SponsorName = string.IsNullOrWhiteSpace(dto.SponsorName) ? null : dto.SponsorName.Trim(),
                AadharNumber = dto.AadharNumber.Trim(),
                AadharImageBase64 = dto.AadharImageBase64,
                PanNumber = dto.PanNumber.Trim(),
                PanImageBase64 = dto.PanImageBase64,
                AccountNumber = dto.AccountNumber.Trim(),
                IfscCode = dto.IfscCode.Trim(),
                PassbookImageBase64 = dto.PassbookImageBase64,
                CenterName = dto.CenterName.Trim(),
                CenterAddress = dto.CenterAddress.Trim(),
                Status = "Pending",
                SubmittedAt = DateTime.UtcNow
            };

            _db.PickupCenterRequests.Add(request);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Application submitted successfully. You'll be able to log in once it's approved.", id = request.Id });
        }

        // POST /api/PickupCenter/login
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] PickupCenterLoginDto dto)
        {
            var username = dto.Username.Trim();

            var center = await _db.PickupCenters.FirstOrDefaultAsync(p => p.Username == username);
            if (center != null)
            {
                if (!_passwordService.VerifyPassword(dto.Password, center.PasswordHash))
                    return Unauthorized(new { message = "Invalid username or password." });

                if (center.Status != "Active")
                    return Unauthorized(new { message = "Your pickup center account is suspended. Contact support." });

                var token = GenerateToken(center);
                return Ok(new PickupCenterLoginResponseDto
                {
                    PucId = center.PucId,
                    Username = center.Username,
                    FullName = center.FullName,
                    CenterName = center.CenterName,
                    Token = token
                });
            }

            var latestRequest = await _db.PickupCenterRequests
                .Where(r => r.Username == username)
                .OrderByDescending(r => r.SubmittedAt)
                .FirstOrDefaultAsync();

            if (latestRequest != null && _passwordService.VerifyPassword(dto.Password, latestRequest.PasswordHash))
            {
                if (latestRequest.Status == "Pending")
                    return Unauthorized(new { message = "Your application is still under review. Please check back later." });

                if (latestRequest.Status == "Rejected")
                    return Unauthorized(new { message = "Your request is rejected, try again." });
            }

            return Unauthorized(new { message = "Invalid username or password." });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/PickupCenter/orders
        // Pickup center buys stock from the company. Multipart form: utr,
        // screenshot (file), items (JSON [{productId, quantity}]), totalAmount.
        // Server recomputes DP/BV/discount from the DB — never trusts client math.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("orders")]
        [Authorize(Roles = "PickupCenter")]
        public async Task<IActionResult> SubmitOrder([FromForm] SubmitPickupCenterOrderFormDto dto)
        {
            var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            if (string.IsNullOrWhiteSpace(dto.Utr))
                return BadRequest(new { message = "UTR / Transaction ID is required." });

            if (dto.Screenshot == null || dto.Screenshot.Length == 0)
                return BadRequest(new { message = "Payment screenshot is required." });

            if (dto.Screenshot.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Screenshot must be smaller than 5MB." });

            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!allowedTypes.Contains(dto.Screenshot.ContentType?.ToLower()))
                return BadRequest(new { message = "Screenshot must be a JPG, PNG, or WEBP image." });

            List<PickupCenterOrderItemSubmissionDto>? items;
            try
            {
                items = JsonSerializer.Deserialize<List<PickupCenterOrderItemSubmissionDto>>(
                    dto.Items ?? "[]",
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException)
            {
                return BadRequest(new { message = "Cart data is invalid." });
            }

            if (items == null || items.Count == 0)
                return BadRequest(new { message = "Your cart is empty." });

            if (items.Any(i => i.Quantity <= 0))
                return BadRequest(new { message = "Item quantity must be at least 1." });

            var productIds = items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _db.Products
                .Where(p => productIds.Contains(p.Id) && p.IsActive)
                .ToListAsync();

            if (products.Count != productIds.Count)
                return BadRequest(new { message = "One or more products are no longer available." });

            // Make sure the company actually has enough stock for each line
            foreach (var item in items)
            {
                var product = products.First(p => p.Id == item.ProductId);
                if (product.Quantity < item.Quantity)
                    return BadRequest(new { message = $"Not enough stock for '{product.ProductName}'. Available: {product.Quantity}." });
            }

            decimal subTotalDp = 0, totalBv = 0;
            var itemSnapshots = new List<object>();
            foreach (var item in items)
            {
                var product = products.First(p => p.Id == item.ProductId);
                subTotalDp += product.Dp * item.Quantity;
                totalBv += product.Bv * item.Quantity;
                itemSnapshots.Add(new
                {
                    productId = product.Id,
                    productName = product.ProductName,
                    quantity = item.Quantity,
                    dp = product.Dp,
                    bv = product.Bv
                });
            }

            if (subTotalDp < MinOrderDp)
                return BadRequest(new
                {
                    message = $"Minimum order value is ₹{MinOrderDp:N0} DP. Your cart totals ₹{subTotalDp:N0} DP.",
                    minimumRequired = MinOrderDp,
                    selected = subTotalDp
                });

            var discountPercent = DiscountPercentAtMin;
            var discountAmount = Math.Round(subTotalDp * discountPercent / 100m, 2);
            var totalAmount = subTotalDp - discountAmount;

            decimal.TryParse(dto.TotalAmount, out var clientTotalAmount);
            if (clientTotalAmount > 0 && Math.Abs(clientTotalAmount - totalAmount) > 0.01m)
            {
                Console.WriteLine(
                    $"[PickupCenter Order Mismatch] puc={center.PucId} clientAmount={clientTotalAmount} serverAmount={totalAmount}");
            }

            string screenshotUrl;
            try
            {
                using var ms = new MemoryStream();
                await dto.Screenshot.CopyToAsync(ms);
                var base64 = Convert.ToBase64String(ms.ToArray());
                var mimeType = dto.Screenshot.ContentType ?? "image/jpeg";
                screenshotUrl = $"data:{mimeType};base64,{base64}";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Screenshot Error] {ex.Message}");
                return StatusCode(500, new { message = "Failed to process screenshot. Please try again." });
            }

            var order = new PickupCenterOrder
            {
                PickupCenterId = center.Id,
                PucId = center.PucId,
                CenterName = center.CenterName,
                ContactName = center.FullName,
                ContactPhone = center.Phone,
                UtrNumber = dto.Utr.Trim(),
                ScreenshotUrl = screenshotUrl,
                ItemsJson = JsonSerializer.Serialize(itemSnapshots),
                SubTotalDp = subTotalDp,
                DiscountPercent = discountPercent,
                DiscountAmount = discountAmount,
                TotalAmount = totalAmount,
                TotalBv = totalBv,
                Status = PickupCenterOrderStatus.Pending,
                RequestedAt = DateTime.UtcNow
            };

            _db.PickupCenterOrders.Add(order);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Order submitted. It will be reviewed by admin shortly.",
                id = order.Id,
                subTotalDp,
                discountPercent,
                discountAmount,
                totalAmount,
                totalBv
            });
        }

        // GET /api/PickupCenter/orders — this center's own order history
        [HttpGet("orders")]
        [Authorize(Roles = "PickupCenter")]
        public async Task<IActionResult> GetMyOrders()
        {
            var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var orders = await _db.PickupCenterOrders
                .Where(o => o.PickupCenterId == center.Id)
                .OrderByDescending(o => o.RequestedAt)
                .ToListAsync();

            var result = orders.Select(MapOrderToDto).ToList();
            return Ok(result);
        }

        // GET /api/PickupCenter/inventory — this center's current stock ("My Stock" tab)
        [HttpGet("inventory")]
        [Authorize(Roles = "PickupCenter")]
        public async Task<IActionResult> GetMyInventory([FromQuery] string? search = null)
        {
            var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            var query =
                from inv in _db.PickupCenterInventoryItems
                where inv.PickupCenterId == center.Id && inv.Quantity > 0
                join p in _db.Products on inv.ProductId equals p.Id
                select new PickupCenterInventoryItemDto
                {
                    ProductId = p.Id,
                    ProductNo = p.ProductNo,
                    ProductName = p.ProductName,
                    Category = p.Category,
                    ImageUrl = p.ImageUrl,
                    Dp = p.Dp,
                    Bv = p.Bv,
                    Mrp = p.Mrp,
                    Quantity = inv.Quantity
                };

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(i => i.ProductName.Contains(search));

            var result = await query.OrderBy(i => i.ProductName).ToListAsync();
            return Ok(result);
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/PickupCenter/Sell
        // Operator sells stock they already hold to a walk-in customer. No admin
        // approval required — this posts instantly: stock leaves the PUC's own
        // inventory, BV/commission are credited to the buyer immediately, and a
        // finalized receipt is generated right away. Dream Plan only for now.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost("Sell")]
        [Authorize(Roles = "PickupCenter")]
        public async Task<IActionResult> Sell([FromBody] PucSaleRequestDto dto)
        {
            var center = await _db.PickupCenters.FirstOrDefaultAsync(c => c.PucId == CurrentPucId);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Cart is empty. Add at least one product." });

            if (dto.Items.Any(i => i.Quantity <= 0))
                return BadRequest(new { message = "Item quantity must be at least 1." });

            var buyer = await _db.Users.FirstOrDefaultAsync(u => u.UserId == dto.UserId.Trim());
            if (buyer == null)
                return NotFound(new { message = $"No user found with ID '{dto.UserId}'." });

            // Pull this PUC's own stock rows for the requested products — a PUC can
            // only sell what it actually holds, never the company's global stock.
            var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
            var invRows = await _db.PickupCenterInventoryItems
                .Where(inv => inv.PickupCenterId == center.Id && productIds.Contains(inv.ProductId))
                .ToListAsync();

            var products = await _db.Products
                .Where(p => productIds.Contains(p.Id) && p.IsActive)
                .ToListAsync();

            if (products.Count != productIds.Count)
                return BadRequest(new { message = "One or more products are no longer available." });

            foreach (var item in dto.Items)
            {
                var stockRow = invRows.FirstOrDefault(r => r.ProductId == item.ProductId);
                var available = stockRow?.Quantity ?? 0;
                if (available < item.Quantity)
                {
                    var name = products.First(p => p.Id == item.ProductId).ProductName;
                    return BadRequest(new { message = $"Not enough stock for '{name}'. Available: {available}." });
                }
            }

            // Recompute price/BV from the DB — never trust client-sent totals.
            decimal totalAmount = 0, totalBv = 0;
            var receiptItems = new List<ReceiptItemData>();
            foreach (var item in dto.Items)
            {
                var product = products.First(p => p.Id == item.ProductId);
                totalAmount += product.Mrp * item.Quantity;
                totalBv += product.Bv * item.Quantity;
                receiptItems.Add(new ReceiptItemData(product.ProductName, item.Quantity, product.Mrp));
            }

            // Deduct from this PUC's own inventory (never from Product.Quantity —
            // that's the company's separate warehouse stock).
            foreach (var item in dto.Items)
            {
                var stockRow = invRows.First(r => r.ProductId == item.ProductId);
                stockRow.Quantity -= item.Quantity;
                stockRow.UpdatedAt = DateTime.UtcNow;
            }

            // Credit BV to the buyer (Dream Plan behavior — mirrors the self-checkout flow).
            buyer.BusinessVolume += (int)totalBv;
            if (!buyer.IsActive)
            {
                buyer.IsActive = true;
                buyer.SelectedPlan = "Dream Plan";
                buyer.IdStatus = "active";
            }

            var order = new PaymentOrder
            {
                UserId = buyer.UserId,
                UtrNumber = $"PUC-{center.PucId}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                PlanType = "Dream Plan",
                TotalAmount = totalAmount,
                TotalBv = totalBv,
                CartItemsJson = JsonSerializer.Serialize(dto.Items),
                Status = PaymentOrderStatus.Approved,
                RequestedAt = DateTime.UtcNow,
                ProcessedAt = DateTime.UtcNow,
                ProcessedByAdminId = null,
                AdminRemarks = $"Instant sale by pickup center {center.PucId} ({center.CenterName}) — {dto.PaymentMethod}.",
                SoldByPucId = center.PucId,
                ReceiptItemsJson = JsonSerializer.Serialize(receiptItems),
                ReceiptTotalAmount = totalAmount,
                ReceiptTotalBv = totalBv,
                ReceiptFinalized = true,
                ReceiptFinalizedAt = DateTime.UtcNow
            };

            _db.PaymentOrders.Add(order);

            try
            {
                // Save the order + stock + BV changes first so commission distribution
                // (which reads/writes wallets) works against a consistent DB state.
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PUC Sell Error] puc={center.PucId} user={buyer.UserId} {ex.Message}");
                return StatusCode(500, new { message = "Failed to complete sale. Please try again." });
            }

            try
            {
                await _commissionService.DistributeProductPurchaseCommissionAsync(
                    buyer.UserId, totalBv, $"puc-sale-{order.Id}");
            }
            catch (Exception ex)
            {
                // Sale + stock + BV are already committed — don't fail the whole sale
                // over a commission hiccup, but make it loud so it can be reconciled.
                Console.WriteLine($"[PUC Sell Commission Error] order={order.Id} {ex.Message}");
            }

            try
            {
                order.ReceiptPdf = _receiptService.GenerateReceiptPdf(new ReceiptData(
                    OrderId: order.Id,
                    UserId: buyer.UserId,
                    CustomerName: buyer.Name,
                    UtrNumber: order.UtrNumber,
                    ReceiptDate: order.ProcessedAt.Value,
                    Items: receiptItems,
                    TotalAmount: totalAmount,
                    TotalBv: totalBv,
                    Notes: order.AdminRemarks
                ));
                order.ReceiptGeneratedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PUC Sell Receipt Error] order={order.Id} {ex.Message}");
            }

            return Ok(new PucSaleResultDto
            {
                OrderId = order.Id,
                CustomerName = buyer.Name,
                TotalAmount = totalAmount,
                TotalBv = totalBv,
                ReceiptAvailable = order.ReceiptPdf != null
            });
        }

        public static PickupCenterOrderDto MapOrderToDto(PickupCenterOrder o)
        {
            var items = new List<PickupCenterOrderItemDto>();
            try
            {
                using var doc = JsonDocument.Parse(o.ItemsJson);
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    var qty = el.GetProperty("quantity").GetInt32();
                    var dp = el.GetProperty("dp").GetDecimal();
                    items.Add(new PickupCenterOrderItemDto
                    {
                        ProductId = el.GetProperty("productId").GetInt32(),
                        ProductName = el.GetProperty("productName").GetString() ?? "Item",
                        Quantity = qty,
                        Dp = dp,
                        Bv = el.GetProperty("bv").GetDecimal(),
                        LineTotal = dp * qty
                    });
                }
            }
            catch (JsonException) { /* leave items empty on malformed legacy rows */ }

            return new PickupCenterOrderDto
            {
                Id = o.Id,
                PucId = o.PucId,
                CenterName = o.CenterName,
                ContactName = o.ContactName,
                ContactPhone = o.ContactPhone,
                Items = items,
                SubTotalDp = o.SubTotalDp,
                DiscountPercent = o.DiscountPercent,
                DiscountAmount = o.DiscountAmount,
                TotalAmount = o.TotalAmount,
                TotalBv = o.TotalBv,
                UtrNumber = o.UtrNumber,
                ScreenshotUrl = o.ScreenshotUrl,
                Status = o.Status.ToString(),
                RequestedAt = o.RequestedAt,
                ProcessedAt = o.ProcessedAt,
                RejectionReason = o.RejectionReason
            };
        }

        private string GenerateToken(PickupCenter center)
        {
            var jwtKey = _config["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT key not configured.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, center.PucId),
                new Claim("Username", center.Username),
                new Claim(ClaimTypes.Name, center.FullName),
                new Claim(ClaimTypes.Role, "PickupCenter")
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
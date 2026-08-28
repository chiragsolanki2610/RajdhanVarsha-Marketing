using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Services;
using System.Security.Claims;

namespace RegisterApi.Controllers
{
    [ApiController]
    [Route("api/Admin")]
    [Authorize(Roles = "Admin")]
    public class AdminPickupCenterController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPickupCenterIdGenerator _idGenerator;

        private static readonly SemaphoreSlim _approveLock = new(1, 1);

        public AdminPickupCenterController(AppDbContext db, IPickupCenterIdGenerator idGenerator)
        {
            _db = db;
            _idGenerator = idGenerator;
        }

        // GET /api/Admin/pickup-center-requests?status=Pending
        [HttpGet("pickup-center-requests")]
        public async Task<IActionResult> GetAllRequests([FromQuery] string? status = null)
        {
            var query = _db.PickupCenterRequests.AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(r => r.Status == status);

            var requests = await query
                .OrderByDescending(r => r.SubmittedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Username,
                    r.Phone,
                    r.FullName,
                    r.SponsorId,
                    r.SponsorName,
                    r.AadharNumber,
                    r.AadharImageBase64,
                    r.PanNumber,
                    r.PanImageBase64,
                    r.AccountNumber,
                    r.IfscCode,
                    r.PassbookImageBase64,
                    r.CenterName,
                    r.CenterAddress,
                    r.Status,
                    r.SubmittedAt,
                    r.ReviewedAt,
                    r.RejectionReason,
                    r.GeneratedPucId
                })
                .ToListAsync();

            return Ok(requests);
        }

        // GET /api/Admin/pickup-center-requests/{id}
        [HttpGet("pickup-center-requests/{id}")]
        public async Task<IActionResult> GetRequest(int id)
        {
            var request = await _db.PickupCenterRequests.FindAsync(id);
            if (request == null) return NotFound(new { message = "Pickup center request not found." });
            return Ok(request);
        }

        // PUT /api/Admin/pickup-center-requests/{id}/status
        [HttpPut("pickup-center-requests/{id}/status")]
        public async Task<IActionResult> UpdateRequestStatus(int id, [FromBody] PickupCenterStatusUpdateDto dto)
        {
            if (dto.Status != "Approved" && dto.Status != "Rejected")
                return BadRequest(new { message = "Status must be 'Approved' or 'Rejected'." });

            var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? User.FindFirstValue("UserId")
                          ?? "Admin";

            var request = await _db.PickupCenterRequests.FindAsync(id);
            if (request == null) return NotFound(new { message = "Pickup center request not found." });

            if (request.Status != "Pending")
                return BadRequest(new { message = $"This request has already been {request.Status.ToLower()}." });

            if (dto.Status == "Rejected")
            {
                request.Status = "Rejected";
                request.ReviewedAt = DateTime.UtcNow;
                request.ReviewedBy = reviewerId;
                request.RejectionReason = dto.RejectionReason;

                await _db.SaveChangesAsync();
                return Ok(new { message = "Pickup center request rejected.", id });
            }

            // --- Approve: generate PUC ID + create the live PickupCenter row ---
            await _approveLock.WaitAsync();
            try
            {
                request = await _db.PickupCenterRequests.FindAsync(id);
                if (request == null) return NotFound(new { message = "Pickup center request not found." });
                if (request.Status != "Pending")
                    return BadRequest(new { message = $"This request has already been {request.Status.ToLower()}." });

                var pucId = await _idGenerator.GenerateNextPucIdAsync();

                var center = new PickupCenter
                {
                    PucId = pucId,
                    Username = request.Username,
                    PasswordHash = request.PasswordHash,
                    Phone = request.Phone,
                    FullName = request.FullName,
                    SponsorId = request.SponsorId,
                    SponsorName = request.SponsorName,
                    AadharNumber = request.AadharNumber,
                    AadharImageBase64 = request.AadharImageBase64,
                    PanNumber = request.PanNumber,
                    PanImageBase64 = request.PanImageBase64,
                    AccountNumber = request.AccountNumber,
                    IfscCode = request.IfscCode,
                    PassbookImageBase64 = request.PassbookImageBase64,
                    CenterName = request.CenterName,
                    CenterAddress = request.CenterAddress,
                    Status = "Active",
                    SourceRequestId = request.Id,
                    CreatedAt = DateTime.UtcNow,
                    ApprovedBy = reviewerId
                };

                _db.PickupCenters.Add(center);

                request.Status = "Approved";
                request.ReviewedAt = DateTime.UtcNow;
                request.ReviewedBy = reviewerId;
                request.GeneratedPucId = pucId;

                await _db.SaveChangesAsync();

                return Ok(new { message = "Pickup center approved successfully.", id, pucId });
            }
            finally
            {
                _approveLock.Release();
            }
        }

        // GET /api/Admin/pickup-centers?status=Active
        [HttpGet("pickup-centers")]
        public async Task<IActionResult> GetAllCenters([FromQuery] string? status = null)
        {
            var query = _db.PickupCenters.AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(c => c.Status == status);

            var centers = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.PucId,
                    c.Username,
                    c.Phone,
                    c.FullName,
                    c.CenterName,
                    c.CenterAddress,
                    c.Status,
                    c.CreatedAt
                })
                .ToListAsync();

            return Ok(centers);
        }

        // PUT /api/Admin/pickup-centers/{id}/status
        [HttpPut("pickup-centers/{id}/status")]
        public async Task<IActionResult> UpdateCenterStatus(int id, [FromBody] PickupCenterStatusUpdateDto dto)
        {
            if (dto.Status != "Active" && dto.Status != "Suspended")
                return BadRequest(new { message = "Status must be 'Active' or 'Suspended'." });

            var center = await _db.PickupCenters.FindAsync(id);
            if (center == null) return NotFound(new { message = "Pickup center not found." });

            center.Status = dto.Status;
            await _db.SaveChangesAsync();

            return Ok(new { message = $"Pickup center {dto.Status.ToLower()} successfully.", id });
        }

        // ═════════════════════════════════════════════════════════════════════
        // Pickup Center Orders — stock purchase requests from pickup centers
        // ═════════════════════════════════════════════════════════════════════

        // GET /api/Admin/pickup-center-orders?status=Pending
        [HttpGet("pickup-center-orders")]
        public async Task<IActionResult> GetAllOrders([FromQuery] string? status = null)
        {
            var query = _db.PickupCenterOrders.AsQueryable();

            if (!string.IsNullOrEmpty(status) &&
                Enum.TryParse<PickupCenterOrderStatus>(status, true, out var parsedStatus))
                query = query.Where(o => o.Status == parsedStatus);

            var orders = await query
                .OrderByDescending(o => o.RequestedAt)
                .ToListAsync();

            return Ok(orders.Select(PickupCenterController.MapOrderToDto).ToList());
        }

        // GET /api/Admin/pickup-center-orders/{id}
        [HttpGet("pickup-center-orders/{id}")]
        public async Task<IActionResult> GetOrder(int id)
        {
            var order = await _db.PickupCenterOrders.FindAsync(id);
            if (order == null) return NotFound(new { message = "Order not found." });
            return Ok(PickupCenterController.MapOrderToDto(order));
        }

        // PUT /api/Admin/pickup-center-orders/{id}/status
        // Accept -> deduct Product.Quantity (company stock), credit the pickup
        // center's own inventory. Reject -> just mark rejected, nothing else changes.
        [HttpPut("pickup-center-orders/{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] PickupCenterOrderStatusUpdateDto dto)
        {
            if (dto.Status != "Accepted" && dto.Status != "Rejected")
                return BadRequest(new { message = "Status must be 'Accepted' or 'Rejected'." });

            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("userId")
                       ?? "Admin";

            await _approveLock.WaitAsync();
            try
            {
                var order = await _db.PickupCenterOrders.FindAsync(id);
                if (order == null) return NotFound(new { message = "Order not found." });

                if (order.Status != PickupCenterOrderStatus.Pending)
                    return BadRequest(new { message = $"This order has already been {order.Status.ToString().ToLower()}." });

                if (dto.Status == "Rejected")
                {
                    order.Status = PickupCenterOrderStatus.Rejected;
                    order.ProcessedAt = DateTime.UtcNow;
                    order.ProcessedByAdminId = adminId;
                    order.RejectionReason = dto.RejectionReason;

                    await _db.SaveChangesAsync();
                    return Ok(new { message = "Order rejected.", id });
                }

                // --- Accept: move stock from company -> pickup center ---
                List<PickupCenterOrderItemDto> items;
                try
                {
                    items = PickupCenterController.MapOrderToDto(order).Items;
                }
                catch
                {
                    return StatusCode(500, new { message = "Order items are corrupted and cannot be processed." });
                }

                var productIds = items.Select(i => i.ProductId).ToList();
                var products = await _db.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToListAsync();

                foreach (var item in items)
                {
                    var product = products.FirstOrDefault(p => p.Id == item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Product '{item.ProductName}' no longer exists." });
                    if (product.Quantity < item.Quantity)
                        return BadRequest(new { message = $"Not enough company stock for '{product.ProductName}'. Available: {product.Quantity}, needed: {item.Quantity}." });
                }

                foreach (var item in items)
                {
                    var product = products.First(p => p.Id == item.ProductId);
                    product.Quantity -= item.Quantity;
                    product.UpdatedAt = DateTime.UtcNow;

                    var invItem = await _db.PickupCenterInventoryItems
                        .FirstOrDefaultAsync(i => i.PickupCenterId == order.PickupCenterId && i.ProductId == item.ProductId);

                    if (invItem == null)
                    {
                        invItem = new PickupCenterInventoryItem
                        {
                            PickupCenterId = order.PickupCenterId,
                            ProductId = item.ProductId,
                            Quantity = 0
                        };
                        _db.PickupCenterInventoryItems.Add(invItem);
                    }

                    invItem.Quantity += item.Quantity;
                    invItem.UpdatedAt = DateTime.UtcNow;
                }

                order.Status = PickupCenterOrderStatus.Accepted;
                order.ProcessedAt = DateTime.UtcNow;
                order.ProcessedByAdminId = adminId;

                await _db.SaveChangesAsync();

                return Ok(new { message = "Order accepted. Stock added to the pickup center's inventory.", id });
            }
            finally
            {
                _approveLock.Release();
            }
        }
    }
}
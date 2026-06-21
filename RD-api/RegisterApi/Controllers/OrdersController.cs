using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Services;
using System.Text.Json;

namespace RegisterApi.Controllers;

[ApiController]
[Route("api/Orders")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IReceiptService _receiptService;
    private readonly ICommissionService _commissionService;

    public OrdersController(AppDbContext db, IReceiptService receiptService, ICommissionService commissionService)
    {
        _db = db;
        _receiptService = receiptService;
        _commissionService = commissionService;
    }

    // ── Helper: get logged-in userId from JWT ──
    private string CurrentUserId =>
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("userId claim missing from token.");

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/Orders/payment
    // Accepts multipart/form-data: utr, screenshot (file), totalAmount, totalBv, cartItems
    // Screenshot is stored as Base64 string directly in the database
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("payment")]
    [Authorize]
    public async Task<IActionResult> SubmitPayment([FromForm] SubmitPaymentFormDto dto)
    {
        // 1. Basic validation
        if (string.IsNullOrWhiteSpace(dto.Utr))
            return BadRequest(new { message = "UTR / Transaction ID is required." });

        if (dto.Screenshot == null || dto.Screenshot.Length == 0)
            return BadRequest(new { message = "Payment screenshot is required." });

        // 2. File size check (max 5MB)
        if (dto.Screenshot.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Screenshot must be smaller than 5MB." });

        // 3. File type check
        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(dto.Screenshot.ContentType?.ToLower()))
            return BadRequest(new { message = "Screenshot must be a JPG, PNG, or WEBP image." });

        var userId = CurrentUserId;
        string screenshotUrl;

        // 4. Convert screenshot to Base64 — stored directly in DB (no bucket needed)
        try
        {
            using var ms = new MemoryStream();
            await dto.Screenshot.CopyToAsync(ms);
            var fileBytes = ms.ToArray();
            var base64 = Convert.ToBase64String(fileBytes);
            var mimeType = dto.Screenshot.ContentType ?? "image/jpeg";
            screenshotUrl = $"data:{mimeType};base64,{base64}";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Screenshot Error] {ex.Message}");
            return StatusCode(500, new { message = "Failed to process screenshot. Please try again." });
        }

        // 5. Parse + validate the cart, then recompute totals from the database —
        //    never trust totalAmount/totalBv sent by the client. This is the only
        //    thing that's authoritative: real Product.Dp / Product.Bv right now.
        List<CartItemSubmissionDto>? cartItems;
        try
        {
            cartItems = JsonSerializer.Deserialize<List<CartItemSubmissionDto>>(
                dto.CartItems ?? "[]",
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Cart data is invalid." });
        }

        if (cartItems == null || cartItems.Count == 0)
            return BadRequest(new { message = "Your cart is empty." });

        if (cartItems.Any(i => i.Quantity <= 0))
            return BadRequest(new { message = "Item quantity must be at least 1." });

        var productIds = cartItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await _db.Products
            .Where(p => productIds.Contains(p.Id) && p.IsActive)
            .ToListAsync();

        if (products.Count != productIds.Count)
            return BadRequest(new { message = "One or more products in your cart are no longer available." });

        decimal totalAmount = 0, totalBv = 0;
        foreach (var item in cartItems)
        {
            var product = products.First(p => p.Id == item.ProductId);
            totalAmount += product.Dp * item.Quantity;
            totalBv += product.Bv * item.Quantity;
        }

        // The client's numbers are only used here to flag a mismatch worth investigating —
        // they never affect what actually gets charged or credited.
        decimal.TryParse(dto.TotalAmount, out var clientTotalAmount);
        decimal.TryParse(dto.TotalBv, out var clientTotalBv);
        if (Math.Abs(clientTotalAmount - totalAmount) > 0.01m || Math.Abs(clientTotalBv - totalBv) > 0.01m)
        {
            Console.WriteLine(
                $"[Cart Mismatch] user={userId} clientAmount={clientTotalAmount} serverAmount={totalAmount} " +
                $"clientBv={clientTotalBv} serverBv={totalBv} cartItems={dto.CartItems}");
        }

        // 6. Save payment order to database
        try
        {
            var order = new PaymentOrder
            {
                UserId = userId,
                UtrNumber = dto.Utr.Trim(),
                ScreenshotUrl = screenshotUrl,
                TotalAmount = totalAmount,
                TotalBv = totalBv,
                CartItemsJson = dto.CartItems ?? "[]",
                Status = PaymentOrderStatus.Pending,
                RequestedAt = DateTime.UtcNow
            };

            _db.PaymentOrders.Add(order);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                orderId = order.Id,
                message = "Payment submitted successfully. Awaiting admin verification."
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB Error] {ex.Message}");
            Console.WriteLine($"[DB Error Inner] {ex.InnerException?.Message}");
            return StatusCode(500, new { message = "Failed to save order. Please try again." });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/Orders/payment-requests?status=Pending
    // Admin: view all payment submissions
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("payment-requests")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetPaymentRequests([FromQuery] PaymentOrderStatus? status = null)
    {
        var query = _db.PaymentOrders.AsQueryable();

        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        var orders = await query
            .OrderByDescending(o => o.RequestedAt)
            .ToListAsync();

        // Batch-fetch user names
        var userIds = orders.Select(o => o.UserId).Distinct().ToList();
        var userNames = await _db.Users
            .Where(u => userIds.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, u => u.Name);

        var result = orders.Select(o => new PaymentOrderDto
        {
            Id = o.Id,
            UserId = o.UserId,
            UserName = userNames.TryGetValue(o.UserId, out var n) ? n : o.UserId,
            UtrNumber = o.UtrNumber,
            ScreenshotUrl = o.ScreenshotUrl,
            TotalAmount = o.TotalAmount,
            TotalBv = o.TotalBv,
            CartItemsJson = o.CartItemsJson,
            Status = o.Status.ToString(),
            RequestedAt = o.RequestedAt,
            ProcessedAt = o.ProcessedAt,
            AdminRemarks = o.AdminRemarks,
            ReceiptAvailable = o.ReceiptFinalized,
            ReceiptDraftReady = o.ReceiptPdf != null
        });

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/Orders/my-orders
    // User: view their own payment history
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("my-orders")]
    [Authorize]
    public async Task<IActionResult> GetMyOrders()
    {
        var userId = CurrentUserId;

        var orders = await _db.PaymentOrders
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.RequestedAt)
            .ToListAsync();

        var result = orders.Select(o => new PaymentOrderDto
        {
            Id = o.Id,
            UserId = o.UserId,
            UserName = string.Empty,
            UtrNumber = o.UtrNumber,
            ScreenshotUrl = o.ScreenshotUrl,
            TotalAmount = o.TotalAmount,
            TotalBv = o.TotalBv,
            CartItemsJson = o.CartItemsJson,
            Status = o.Status.ToString(),
            RequestedAt = o.RequestedAt,
            ProcessedAt = o.ProcessedAt,
            AdminRemarks = o.AdminRemarks,
            ReceiptAvailable = o.ReceiptFinalized
        });

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/Orders/payment-requests/{id}/approve
    // Admin: approve a pending payment
    // Body: { "adminRemarks": "Verified UTR" }
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("payment-requests/{id}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ApprovePayment(int id, [FromBody] ProcessPaymentOrderDto dto)
    {
        var adminId = CurrentUserId;
        var order = await _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Payment order not found." });

        if (order.Status != PaymentOrderStatus.Pending)
            return BadRequest(new { message = "This order has already been processed." });

        order.Status = PaymentOrderStatus.Approved;
        order.ProcessedAt = DateTime.UtcNow;
        order.ProcessedByAdminId = adminId;
        order.AdminRemarks = dto.AdminRemarks;

        // ── Pay BV-based commission (self bonus + up to 12 levels upline) ──
        // This is the ONLY place a shop order actually pays anyone — safe to run
        // exactly once since Status was just flipped from Pending above, and
        // re-approving an already-processed order is blocked by the check up top.
        // "order-{id}" (vs a bare Plan.Id) lets the commission history reader
        // tell shop-order commissions apart from Plan-purchase commissions.
        bool commissionDistributed = false;
        try
        {
            await _commissionService.DistributeProductPurchaseCommissionAsync(
                order.UserId, order.TotalBv, $"order-{order.Id}");
            commissionDistributed = true;
        }
        catch (Exception ex)
        {
            // Don't block the approval on a commission bug — but this needs a human to
            // notice and fix, since real money/BV is on the line. Surfaced in the response below.
            Console.WriteLine($"[Commission Error] Failed to distribute commission for order {order.Id}: {ex.Message}");
        }

        // ── Auto-build a receipt DRAFT for admin to review/edit ──
        // This does NOT make the receipt visible to the user — that only happens
        // once the admin explicitly finalizes it via POST .../receipt/finalize.
        var customerName = await _db.Users
            .Where(u => u.UserId == order.UserId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync() ?? order.UserId;

        try
        {
            var items = CartItemParser.Parse(order.CartItemsJson);

            order.ReceiptItemsJson = JsonSerializer.Serialize(items);
            order.ReceiptTotalAmount = order.TotalAmount;
            order.ReceiptTotalBv = order.TotalBv;
            order.ReceiptNotes = dto.AdminRemarks;

            order.ReceiptPdf = _receiptService.GenerateReceiptPdf(BuildReceiptData(order, items, customerName));
            order.ReceiptGeneratedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            // Don't let a receipt-rendering bug block the approval itself —
            // the order is still approved; admin can retry from the receipt draft screen.
            Console.WriteLine($"[Receipt Error] Failed to generate receipt draft for order {order.Id}: {ex.Message}");
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Payment approved. A receipt draft was generated — review and finalize it to send to the user.",
            receiptDraftReady = order.ReceiptPdf != null,
            commissionDistributed
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/Orders/payment-requests/{id}/reject
    // Admin: reject a pending payment
    // Body: { "adminRemarks": "Invalid UTR number" }
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("payment-requests/{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RejectPayment(int id, [FromBody] ProcessPaymentOrderDto dto)
    {
        var adminId = CurrentUserId;
        var order = await _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Payment order not found." });

        if (order.Status != PaymentOrderStatus.Pending)
            return BadRequest(new { message = "This order has already been processed." });

        order.Status = PaymentOrderStatus.Rejected;
        order.ProcessedAt = DateTime.UtcNow;
        order.ProcessedByAdminId = adminId;
        order.AdminRemarks = dto.AdminRemarks;

        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Payment rejected." });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/Orders/{id}/receipt
    // User: download their own FINALIZED receipt PDF
    // Admin: download any order's latest receipt PDF (draft or final)
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("{id}/receipt")]
    [Authorize]
    public async Task<IActionResult> DownloadReceipt(int id)
    {
        var order = await _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Payment order not found." });

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && order.UserId != CurrentUserId)
            return Forbid();

        if (order.ReceiptPdf == null || (!isAdmin && !order.ReceiptFinalized))
            return NotFound(new { message = "Receipt is not available for this order yet." });

        return File(order.ReceiptPdf, "application/pdf", $"Receipt-ORD-{order.Id:D6}.pdf");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/Orders/payment-requests/{id}/receipt/draft
    // Admin: fetch the editable receipt draft (items, totals, notes) for review
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("payment-requests/{id}/receipt/draft")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetReceiptDraft(int id)
    {
        var order = await _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new { message = "Payment order not found." });

        if (order.Status != PaymentOrderStatus.Approved)
            return BadRequest(new { message = "Approve the payment before reviewing its receipt." });

        var customerName = await _db.Users
            .Where(u => u.UserId == order.UserId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync() ?? order.UserId;

        var items = CartItemParser.Parse(
            string.IsNullOrWhiteSpace(order.ReceiptItemsJson) ? order.CartItemsJson : order.ReceiptItemsJson);

        return Ok(new ReceiptDraftDto
        {
            OrderId = order.Id,
            CustomerName = customerName,
            Items = items.Select(i => new ReceiptItemDto { Name = i.Name, Quantity = i.Quantity, UnitPrice = i.UnitPrice }).ToList(),
            TotalAmount = order.ReceiptTotalAmount ?? order.TotalAmount,
            TotalBv = order.ReceiptTotalBv ?? order.TotalBv,
            Notes = order.ReceiptNotes,
            ReceiptFinalized = order.ReceiptFinalized,
            ReceiptFinalizedAt = order.ReceiptFinalizedAt
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/Orders/payment-requests/{id}/receipt/draft
    // Admin: edit the receipt's items / totals / notes and regenerate the PDF preview.
    // Editing an already-finalized receipt un-finalizes it — admin must re-finalize
    // before the user sees the updated version.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPut("payment-requests/{id}/receipt/draft")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateReceiptDraft(int id, [FromBody] UpdateReceiptDraftDto dto)
    {
        var order = await _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new { message = "Payment order not found." });

        if (order.Status != PaymentOrderStatus.Approved)
            return BadRequest(new { message = "Approve the payment before editing its receipt." });

        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new { message = "Receipt must have at least one item." });

        var items = dto.Items
            .Select(i => new ReceiptItemData(string.IsNullOrWhiteSpace(i.Name) ? "Item" : i.Name.Trim(), i.Quantity, i.UnitPrice))
            .ToList();

        order.ReceiptItemsJson = JsonSerializer.Serialize(items);
        order.ReceiptTotalAmount = dto.TotalAmount;
        order.ReceiptTotalBv = dto.TotalBv;
        order.ReceiptNotes = dto.Notes;

        // Require an explicit re-finalize after any edit so a sent receipt never
        // silently changes underneath the user.
        order.ReceiptFinalized = false;
        order.ReceiptFinalizedAt = null;

        var customerName = await _db.Users
            .Where(u => u.UserId == order.UserId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync() ?? order.UserId;

        try
        {
            order.ReceiptPdf = _receiptService.GenerateReceiptPdf(BuildReceiptData(order, items, customerName));
            order.ReceiptGeneratedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Receipt Error] Failed to regenerate receipt for order {order.Id}: {ex.Message}");
            return StatusCode(500, new { message = "Failed to regenerate the receipt preview. Please try again." });
        }

        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Receipt draft updated. Preview it, then finalize to send it to the user." });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/Orders/payment-requests/{id}/receipt/preview
    // Admin: download the current draft/latest PDF to check it before sending —
    // works regardless of finalize state.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("payment-requests/{id}/receipt/preview")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> PreviewReceipt(int id)
    {
        var order = await _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new { message = "Payment order not found." });

        if (order.ReceiptPdf == null)
            return NotFound(new { message = "No receipt has been generated for this order yet." });

        return File(order.ReceiptPdf, "application/pdf", $"Receipt-Preview-ORD-{order.Id:D6}.pdf");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/Orders/payment-requests/{id}/receipt/finalize
    // Admin: publish the current receipt draft — only after this does it become
    // visible/downloadable to the user in their order history.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("payment-requests/{id}/receipt/finalize")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> FinalizeReceipt(int id)
    {
        var order = await _db.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new { message = "Payment order not found." });

        if (order.Status != PaymentOrderStatus.Approved)
            return BadRequest(new { message = "Only approved orders can have a receipt finalized." });

        if (order.ReceiptPdf == null)
            return BadRequest(new { message = "Generate or edit the receipt before finalizing it." });

        order.ReceiptFinalized = true;
        order.ReceiptFinalizedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Receipt finalized — the user can now see and download it." });
    }

    private static ReceiptData BuildReceiptData(PaymentOrder order, List<ReceiptItemData> items, string customerName) =>
        new ReceiptData(
            OrderId: order.Id,
            UserId: order.UserId,
            CustomerName: customerName,
            UtrNumber: order.UtrNumber,
            ReceiptDate: order.ProcessedAt ?? order.RequestedAt,
            Items: items,
            TotalAmount: order.ReceiptTotalAmount ?? order.TotalAmount,
            TotalBv: order.ReceiptTotalBv ?? order.TotalBv,
            Notes: order.ReceiptNotes
        );
}
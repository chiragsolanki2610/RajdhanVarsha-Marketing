using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Services;
using System.Security.Claims;

namespace RegisterApi.Controllers;

[ApiController]
[Route("api/binary")]
[Authorize]
public class BinaryPlanController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IBinaryPlanService _binaryService;

    // Must buy ≥600 BV of products to activate Binary Plan ID
    private const decimal BinaryPlanActivationBv = 600m;

    public BinaryPlanController(AppDbContext db, IBinaryPlanService binaryService)
    {
        _db = db;
        _binaryService = binaryService;
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/binary/status
    // Returns current user's binary plan enrollment & wallet snapshot.
    // ─────────────────────────────────────────────────────────────────────
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == userId);

        if (node == null)
            return Ok(new BinaryNodeStatusDto { IsInBinaryPlan = false });

        return Ok(new BinaryNodeStatusDto
        {
            IsInBinaryPlan = true,
            IsActive = node.IsActive,
            Position = node.Position,
            ParentId = node.ParentId,
            LeftChildId = node.LeftChildId,
            RightChildId = node.RightChildId,
            TreeLevel = node.TreeLevel,
            LeftLegCount = node.LeftLegCount,
            RightLegCount = node.RightLegCount,
            TotalDownlineCount = node.LeftLegCount + node.RightLegCount,
            WithdrawalUnlocked = wallet?.WithdrawalUnlocked ?? false,
            PairsCompleted = wallet?.PairsCount ?? 0,
            WalletBalance = wallet?.Balance ?? 0
        });
    }


    // ─────────────────────────────────────────────────────────────────────
    // GET /api/binary/preview-placement?sponsorId=RD0001&preferredPosition=LEFT
    // Call this BEFORE joining — shows exactly where user will land in the tree.
    // ─────────────────────────────────────────────────────────────────────
    [HttpGet("preview-placement")]
    public async Task<IActionResult> PreviewPlacement(
        [FromQuery] string sponsorId,
        [FromQuery] string preferredPosition = "LEFT")
    {
        if (string.IsNullOrWhiteSpace(sponsorId))
            return BadRequest(new { message = "sponsorId is required." });

        var result = await _binaryService.PreviewPlacementAsync(sponsorId, preferredPosition);
        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(result);
    }



    // ─────────────────────────────────────────────────────────────────────
    // POST /api/binary/join
    // Enroll in the binary tree (placement only — ID activates after product purchase).
    // Body: { sponsorId: "RD0001", preferredPosition: "LEFT" }
    // ─────────────────────────────────────────────────────────────────────
    [HttpPost("join")]
    public async Task<IActionResult> JoinBinaryPlan([FromBody] JoinBinaryPlanDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // ── RD0001 is the root node — no sponsor or position required ──
        if (userId == "RD0001")
        {
            var rootResult = await _binaryService.PlaceRootNodeAsync(userId);
            if (!rootResult.Success)
                return BadRequest(new { message = rootResult.Message });
            return Ok(rootResult);
        }

        if (string.IsNullOrWhiteSpace(dto.SponsorId))
            return BadRequest(new { message = "sponsorId is required." });

        var result = await _binaryService.PlaceUserInBinaryTreeAsync(
            userId, dto.SponsorId, dto.PreferredPosition);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/binary/activate
    // Purchase ≥600 BV products to activate the Binary Plan ID.
    // Uses the same Products table as the Dream Plan shop.
    // Body: { items: [{ productId, quantity }] }
    // ─────────────────────────────────────────────────────────────────────
    [HttpPost("activate")]
    public async Task<IActionResult> ActivateBinaryId([FromBody] BinaryActivationDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        if (node == null)
            return BadRequest(new { message = "You must join the Binary Plan first via POST /api/binary/join." });

        if (node.IsActive)
            return BadRequest(new { message = "Your Binary Plan ID is already active." });

        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new { message = "No products selected." });

        var productIds = dto.Items.Select(i => i.ProductId).ToList();
        var products = await _db.Products
            .Where(p => productIds.Contains(p.Id) && p.IsActive)
            .ToListAsync();

        if (products.Count != productIds.Distinct().Count())
            return BadRequest(new { message = "One or more products are invalid." });

        decimal totalBv = 0, totalAmount = 0;
        foreach (var item in dto.Items)
        {
            var product = products.First(p => p.Id == item.ProductId);
            if (item.Quantity <= 0)
                return BadRequest(new { message = $"Invalid quantity for {product.ProductName}." });
            totalBv += product.Bv * item.Quantity;
            totalAmount += product.Mrp * item.Quantity;
        }

        if (totalBv < BinaryPlanActivationBv)
            return BadRequest(new
            {
                message = $"Binary Plan requires at least {BinaryPlanActivationBv} BV. You selected {totalBv} BV.",
                required = BinaryPlanActivationBv,
                selected = totalBv
            });

        // Record as a Plan purchase (PlanType = "Binary Plan") for consistency
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null) return NotFound();

        var plan = new Plan
        {
            UserId = userId,
            PlanType = "Binary Plan",
            Status = PlanStatus.Paid,
            TotalBv = totalBv,
            TotalAmount = totalAmount,
            CreatedAt = DateTime.UtcNow
        };
        foreach (var item in dto.Items)
        {
            var product = products.First(p => p.Id == item.ProductId);
            plan.Items.Add(new PlanItem
            {
                ProductId = product.Id,
                Quantity = item.Quantity,
                Bv = product.Bv,
                Mrp = product.Mrp
            });
        }
        _db.Plans.Add(plan);

        // Update User record
        user.IsActive = true;
        user.SelectedPlan = "Binary Plan";
        user.BusinessVolume += (int)totalBv;
        user.IdStatus = "active";

        await _db.SaveChangesAsync();

        // Activate the binary node
        // Activate the binary node and award pair commissions to uplines
        // when both LEFT and RIGHT children are active.
        await _binaryService.ActivateBinaryNodeAsync(userId, totalBv, awardPairs: true);

        return Ok(new
        {
            message = "Binary Plan ID activated successfully.",
            totalBv,
            totalAmount,
            planId = plan.Id
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/binary/tree
    // Returns the binary tree rooted at the current user (up to 10 levels).
    // ─────────────────────────────────────────────────────────────────────
    [HttpGet("tree")]
    public async Task<IActionResult> GetMyBinaryTree([FromQuery] int depth = 5)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        depth = Math.Clamp(depth, 1, 10);
        var tree = await _binaryService.GetBinaryTreeAsync(userId, depth);

        if (tree == null)
            return NotFound(new { message = "You are not enrolled in the Binary Plan." });

        return Ok(tree);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/binary/wallet
    // Returns current user's binary wallet balance, pairs, transactions.
    // ─────────────────────────────────────────────────────────────────────
    [HttpGet("wallet")]
    public async Task<IActionResult> GetWallet()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var wallet = await _binaryService.GetBinaryWalletAsync(userId);
        return Ok(wallet);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/binary/withdraw
    // Request a withdrawal from the binary wallet.
    // ─────────────────────────────────────────────────────────────────────
    [HttpPost("withdraw")]
    public async Task<IActionResult> RequestWithdrawal([FromBody] BinaryWithdrawalRequestDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var (success, message) = await _binaryService.RequestWithdrawalAsync(userId, dto.Amount);

        if (!success) return BadRequest(new { message });
        return Ok(new { message });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ADMIN: GET /api/binary/admin/pending-withdrawals
    // ─────────────────────────────────────────────────────────────────────
    [HttpGet("admin/pending-withdrawals")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetPendingWithdrawals()
    {
        var pending = await _db.BinaryWithdrawalRequests
            .Where(r => r.Status == "Pending")
            .OrderBy(r => r.RequestedAt)
            .ToListAsync();

        return Ok(pending);
    }

    // ─────────────────────────────────────────────────────────────────────
    // ADMIN: POST /api/binary/admin/process-withdrawal/{id}
    // ─────────────────────────────────────────────────────────────────────
    [HttpPost("admin/process-withdrawal/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ProcessWithdrawal(int id, [FromBody] ProcessBinaryWithdrawalDto dto)
    {
        var (success, message) = await _binaryService.ProcessWithdrawalAsync(id, dto.Approve, dto.AdminNote);

        if (!success) return BadRequest(new { message });
        return Ok(new { message });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ADMIN: POST /api/binary/admin/approve-activation/{userId}
    // Manually approve/activate a Binary Plan ID without requiring a 
    // product purchase. Useful for admin overrides or special cases.
    // ─────────────────────────────────────────────────────────────────────
    [HttpPost("admin/approve-activation/{userId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminApproveBinaryActivation(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { message = "userId is required." });

        // Check if user exists in binary tree
        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        if (node == null)
            return NotFound(new { message = $"User '{userId}' is not enrolled in the Binary Plan." });

        // Check if already active
        if (node.IsActive)
            return BadRequest(new { message = $"User '{userId}' Binary Plan ID is already active." });

        // Activate the binary node (0 BV since no purchase)
        await _binaryService.ActivateBinaryNodeAsync(userId, 0);

        // Also update the User record for consistency
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user != null)
        {
            user.IsActive = true;
            user.IdStatus = "active";
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            message = $"Binary Plan ID for user '{userId}' has been activated by admin.",
            userId = userId,
            isActive = true,
            activatedAt = DateTime.UtcNow
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────────────────────────────────
    private string? GetUserId() =>
        User.FindFirst("userId")?.Value ??
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
}
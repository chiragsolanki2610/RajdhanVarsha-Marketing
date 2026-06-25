using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Services;

public class BinaryPlanService : IBinaryPlanService
{
    private readonly AppDbContext _db;
    private const decimal PairCommission = 150m;
    private const int MinDownlineForWithdrawal = 3; // at least 3 downlines (e.g. 2L+1R or 1L+2R)

    public BinaryPlanService(AppDbContext db)
    {
        _db = db;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PLACE USER IN TREE
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<BinaryPlacementResultDto> PlaceUserInBinaryTreeAsync(
        string newUserId, string sponsorId, string preferredPosition)
    {
        preferredPosition = preferredPosition.ToUpper().Trim();
        if (preferredPosition != "LEFT" && preferredPosition != "RIGHT")
            return Fail("Position must be LEFT or RIGHT.");

        // Prevent duplicate placement
        var existing = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == newUserId);
        if (existing != null)
            return Fail($"{newUserId} is already placed in the binary tree.");

        // Verify sponsor exists in the tree
        var sponsorNode = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == sponsorId);
        if (sponsorNode == null)
            return Fail($"Sponsor {sponsorId} is not in the binary tree.");

        // ── Find the actual parent node using BFS down the preferred leg ──
        // If the sponsor's preferred slot is taken, we go deeper in that leg
        // until we find a node with an empty slot.
        var (parentNode, actualPosition) = await FindPlacementSlotAsync(sponsorNode, preferredPosition);

        if (parentNode == null)
            return Fail("No available slot found in the binary tree.");

        // Create the new node
        var newNode = new BinaryNode
        {
            UserId = newUserId,
            SponsorId = sponsorId,
            ParentId = parentNode.UserId,
            Position = actualPosition,
            TreeLevel = parentNode.TreeLevel + 1,
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.BinaryNodes.Add(newNode);

        // Update parent's child pointer
        if (actualPosition == "LEFT")
            parentNode.LeftChildId = newUserId;
        else
            parentNode.RightChildId = newUserId;

        parentNode.UpdatedAt = DateTime.UtcNow;

        // Increment leg counts all the way up the tree
        await IncrementLegCountsUpAsync(parentNode, actualPosition);

        // Create the user's binary wallet (starts empty, locked)
        var wallet = new BinaryWallet
        {
            UserId = newUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.BinaryWallets.Add(wallet);

        await _db.SaveChangesAsync();

        return new BinaryPlacementResultDto
        {
            Success = true,
            Message = $"{newUserId} placed in binary tree under {parentNode.UserId} on {actualPosition} side.",
            UserId = newUserId,
            ParentId = parentNode.UserId,
            Position = actualPosition,
            TreeLevel = newNode.TreeLevel
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ACTIVATE NODE (after 600 BV product purchase)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task ActivateBinaryNodeAsync(string userId, decimal bvPurchased)
    {
        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        if (node == null) return;

        node.IsActive = true;
        node.ActivatedAt = DateTime.UtcNow;
        node.TotalBv += bvPurchased;
        node.UpdatedAt = DateTime.UtcNow;

        // Propagate BV up the tree
        await PropagateBvUpAsync(node, bvPurchased);

        // Check withdrawal unlock for this user
        await UpdateWithdrawalUnlockAsync(userId);

        await _db.SaveChangesAsync();

        // Check if parent now has BOTH children active → award pair commission
        if (!string.IsNullOrEmpty(node.ParentId))
        {
            await CheckAndAwardPairCommissionAsync(node.ParentId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. GET BINARY TREE (recursive, max depth)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<BinaryTreeNodeDto?> GetBinaryTreeAsync(string userId, int maxDepth = 10)
    {
        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        if (node == null) return null;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == userId);

        var dto = new BinaryTreeNodeDto
        {
            UserId = node.UserId,
            Name = user?.Name ?? node.UserId,
            ParentId = node.ParentId,
            Position = node.ParentId == null ? "ROOT" : node.Position,
            TreeLevel = node.TreeLevel,
            IsActive = node.IsActive,
            IdStatus = node.IsActive ? "active" : "inactive",
            TotalBv = node.TotalBv,
            PairsCount = wallet?.PairsCount ?? 0
        };

        if (maxDepth <= 0) return dto;

        if (!string.IsNullOrEmpty(node.LeftChildId))
            dto.LeftChild = await GetBinaryTreeAsync(node.LeftChildId, maxDepth - 1);

        if (!string.IsNullOrEmpty(node.RightChildId))
            dto.RightChild = await GetBinaryTreeAsync(node.RightChildId, maxDepth - 1);

        return dto;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. GET BINARY WALLET
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<BinaryWalletDto> GetBinaryWalletAsync(string userId)
    {
        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null)
        {
            return new BinaryWalletDto
            {
                UserId = userId,
                WithdrawalUnlockMessage = "You are not enrolled in the Binary Plan."
            };
        }

        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        var totalDownline = (node?.LeftLegCount ?? 0) + (node?.RightLegCount ?? 0);

        var txns = await _db.BinaryWalletTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(20)
            .Select(t => new BinaryTxnDto
            {
                Id = t.Id,
                Type = t.Type.ToString(),
                Amount = t.Amount,
                BalanceAfter = t.BalanceAfter,
                Source = t.Source,
                Description = t.Description,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        string unlockMsg = wallet.WithdrawalUnlocked
            ? "Withdrawal unlocked ✓"
            : $"Need {MinDownlineForWithdrawal - totalDownline} more downline member(s) to unlock withdrawal. " +
              $"(Current: {totalDownline}, Need: {MinDownlineForWithdrawal})";

        return new BinaryWalletDto
        {
            UserId = userId,
            Balance = wallet.Balance,
            TotalEarned = wallet.TotalEarned,
            TotalWithdrawn = wallet.TotalWithdrawn,
            PairsCount = wallet.PairsCount,
            WithdrawalUnlocked = wallet.WithdrawalUnlocked,
            WithdrawalUnlockMessage = unlockMsg,
            RecentTransactions = txns
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. REQUEST WITHDRAWAL
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<(bool success, string message)> RequestWithdrawalAsync(string userId, decimal amount)
    {
        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null)
            return (false, "Binary wallet not found. Join the Binary Plan first.");

        if (!wallet.WithdrawalUnlocked)
            return (false, "Withdrawal is locked. You need at least 3 downline members (e.g., 2 on one side + 1 on the other) before your first withdrawal.");

        if (amount <= 0)
            return (false, "Amount must be greater than 0.");

        if (amount > wallet.Balance)
            return (false, $"Insufficient balance. Available: ₹{wallet.Balance:F2}");

        const decimal minWithdrawal = 250m;
        if (amount < minWithdrawal)
            return (false, $"Minimum withdrawal amount is ₹{minWithdrawal}.");

        // Check for existing pending request
        var hasPending = await _db.BinaryWithdrawalRequests
            .AnyAsync(r => r.UserId == userId && r.Status == "Pending");
        if (hasPending)
            return (false, "You already have a pending withdrawal request.");

        var request = new BinaryWithdrawalRequest
        {
            UserId = userId,
            Amount = amount,
            Status = "Pending",
            RequestedAt = DateTime.UtcNow
        };
        _db.BinaryWithdrawalRequests.Add(request);
        await _db.SaveChangesAsync();

        return (true, $"Withdrawal request of ₹{amount:F2} submitted successfully.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. ADMIN: PROCESS WITHDRAWAL
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<(bool success, string message)> ProcessWithdrawalAsync(
        int requestId, bool approve, string adminNote)
    {
        var request = await _db.BinaryWithdrawalRequests.FindAsync(requestId);
        if (request == null)
            return (false, "Withdrawal request not found.");

        if (request.Status != "Pending")
            return (false, $"Request is already {request.Status}.");

        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == request.UserId);
        if (wallet == null)
            return (false, "Wallet not found.");

        request.Status = approve ? "Approved" : "Rejected";
        request.ProcessedAt = DateTime.UtcNow;
        request.AdminNote = adminNote;

        if (approve)
        {
            if (request.Amount > wallet.Balance)
                return (false, "Insufficient wallet balance.");

            wallet.Balance -= request.Amount;
            wallet.TotalWithdrawn += request.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var txn = new BinaryWalletTransaction
            {
                UserId = request.UserId,
                Type = BinaryTxnType.Debit,
                Amount = request.Amount,
                BalanceAfter = wallet.Balance,
                Source = "Withdrawal",
                Description = $"Withdrawal approved. Ref: WR-{requestId}",
                ReferenceId = $"WR-{requestId}",
                CreatedAt = DateTime.UtcNow
            };
            _db.BinaryWalletTransactions.Add(txn);
        }

        await _db.SaveChangesAsync();
        return (true, approve ? "Withdrawal approved." : "Withdrawal rejected.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// BFS down the preferred leg to find the first node with an empty slot.
    /// Returns (parentNode, actualPosition).
    /// </summary>
    private async Task<(BinaryNode? node, string position)> FindPlacementSlotAsync(
        BinaryNode sponsor, string preferredPosition)
    {
        var queue = new Queue<(BinaryNode node, string leg)>();
        queue.Enqueue((sponsor, preferredPosition));

        while (queue.Count > 0)
        {
            var (current, leg) = queue.Dequeue();

            string leftId = current.LeftChildId ?? "";
            string rightId = current.RightChildId ?? "";

            if (leg == "LEFT")
            {
                if (string.IsNullOrEmpty(leftId))
                    return (current, "LEFT");

                // Left is taken — go deeper on the left leg
                var leftChild = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == leftId);
                if (leftChild != null)
                    queue.Enqueue((leftChild, "LEFT"));
            }
            else // RIGHT
            {
                if (string.IsNullOrEmpty(rightId))
                    return (current, "RIGHT");

                // Right is taken — go deeper on the right leg
                var rightChild = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == rightId);
                if (rightChild != null)
                    queue.Enqueue((rightChild, "RIGHT"));
            }
        }

        return (null, string.Empty);
    }

    /// <summary>
    /// Walks up the tree from `startNode` and increments leg counts.
    /// </summary>
    private async Task IncrementLegCountsUpAsync(BinaryNode startNode, string childPosition)
    {
        var current = startNode;
        var comingFromPosition = childPosition; // which leg the new member is on relative to current

        while (current != null)
        {
            if (comingFromPosition == "LEFT")
                current.LeftLegCount++;
            else
                current.RightLegCount++;

            current.UpdatedAt = DateTime.UtcNow;

            if (string.IsNullOrEmpty(current.ParentId)) break;

            var parent = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == current.ParentId);
            comingFromPosition = current.Position; // which leg current is under its parent
            current = parent;
        }
    }

    /// <summary>
    /// Propagates BV up the tree after activation.
    /// </summary>
    private async Task PropagateBvUpAsync(BinaryNode activatedNode, decimal bv)
    {
        var current = activatedNode;

        while (!string.IsNullOrEmpty(current.ParentId))
        {
            var parent = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == current.ParentId);
            if (parent == null) break;

            if (current.Position == "LEFT")
                parent.LeftLegBv += bv;
            else
                parent.RightLegBv += bv;

            parent.TotalBv += bv;
            parent.UpdatedAt = DateTime.UtcNow;

            current = parent;
        }
    }

    /// <summary>
    /// Checks if parentId now has both left AND right children ACTIVE.
    /// If so, awards ₹150 pair commission once per pair event.
    /// A "pair event" happens each time a NEW active member completes
    /// both sides — but we only fire it for the newly activated child's
    /// contribution (i.e., one side was already active and now the other just activated).
    /// </summary>
    private async Task CheckAndAwardPairCommissionAsync(string parentUserId)
    {
        var parent = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == parentUserId);
        if (parent == null) return;

        if (string.IsNullOrEmpty(parent.LeftChildId) || string.IsNullOrEmpty(parent.RightChildId))
            return; // both slots must be filled

        var leftNode = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == parent.LeftChildId);
        var rightNode = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == parent.RightChildId);

        if (leftNode == null || rightNode == null) return;
        if (!leftNode.IsActive || !rightNode.IsActive) return;

        // Prevent double-crediting the same pair
        var alreadyPaid = await _db.BinaryPairs.AnyAsync(p =>
            p.UserId == parentUserId &&
            p.LeftChildId == parent.LeftChildId &&
            p.RightChildId == parent.RightChildId);

        if (alreadyPaid) return;

        // Record the pair
        var pair = new BinaryPair
        {
            UserId = parentUserId,
            LeftChildId = parent.LeftChildId!,
            RightChildId = parent.RightChildId!,
            CommissionAmt = PairCommission,
            CreditedAt = DateTime.UtcNow
        };
        _db.BinaryPairs.Add(pair);

        // Credit the parent's binary wallet
        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == parentUserId);
        if (wallet == null)
        {
            wallet = new BinaryWallet { UserId = parentUserId, CreatedAt = DateTime.UtcNow };
            _db.BinaryWallets.Add(wallet);
        }

        wallet.Balance += PairCommission;
        wallet.TotalEarned += PairCommission;
        wallet.PairsCount += 1;
        wallet.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(); // save pair + wallet first so we have pair.Id

        var txn = new BinaryWalletTransaction
        {
            UserId = parentUserId,
            Type = BinaryTxnType.Credit,
            Amount = PairCommission,
            BalanceAfter = wallet.Balance,
            Source = "Pair Commission",
            Description = $"₹150 pair commission: {pair.LeftChildId} (L) + {pair.RightChildId} (R)",
            ReferenceId = pair.Id.ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _db.BinaryWalletTransactions.Add(txn);

        // Unlock withdrawal once ≥3 downlines exist
        await UpdateWithdrawalUnlockAsync(parentUserId);

        await _db.SaveChangesAsync();

        // Cascade up: the parent's parent also gets a pair check
        if (!string.IsNullOrEmpty(parent.ParentId))
            await CheckAndAwardPairCommissionAsync(parent.ParentId);
    }

    /// <summary>
    /// Unlocks withdrawal if the user has ≥3 total downline members
    /// (the rule requires at least one leg to have ≥2).
    /// </summary>
    private async Task UpdateWithdrawalUnlockAsync(string userId)
    {
        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        if (node == null) return;

        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null) return;

        int leftCount = node.LeftLegCount;
        int rightCount = node.RightLegCount;
        int total = leftCount + rightCount;

        // Rule: total ≥ 3 AND at least one leg has ≥ 2 (i.e., 2+1 or 1+2 or 2+2 or more)
        bool unlocked = total >= MinDownlineForWithdrawal &&
                        (leftCount >= 2 || rightCount >= 2);

        if (!wallet.WithdrawalUnlocked && unlocked)
        {
            wallet.WithdrawalUnlocked = true;
            wallet.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static BinaryPlacementResultDto Fail(string msg) =>
        new() { Success = false, Message = msg };
}
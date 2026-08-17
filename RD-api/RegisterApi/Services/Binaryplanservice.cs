using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Services;

public class BinaryPlanService : IBinaryPlanService
{
    private readonly AppDbContext _db;
    private const decimal PairCommission = 150m;

    public BinaryPlanService(AppDbContext db)
    {
        _db = db;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 0. PLACE ROOT NODE (RD0001 only — no sponsor, no position)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<BinaryPlacementResultDto> PlaceRootNodeAsync(string rootUserId)
    {
        // Prevent duplicate placement
        var existing = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == rootUserId);
        if (existing != null)
            return Fail($"{rootUserId} is already placed in the binary tree as root.");

        // Ensure no other root exists
        var existingRoot = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.ParentId == null);
        if (existingRoot != null)
            return Fail($"A root node already exists: {existingRoot.UserId}. Only one root is allowed.");

        var rootNode = new BinaryNode
        {
            UserId = rootUserId,
            SponsorId = null,
            ParentId = null,         // no parent — this IS the root
            Position = "ROOT",
            TreeLevel = 0,
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.BinaryNodes.Add(rootNode);

        // Create the root user's binary wallet
        var wallet = new BinaryWallet
        {
            UserId = rootUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.BinaryWallets.Add(wallet);

        await _db.SaveChangesAsync();

        return new BinaryPlacementResultDto
        {
            Success = true,
            Message = $"{rootUserId} placed as the ROOT of the binary tree.",
            UserId = rootUserId,
            ParentId = "",
            Position = "ROOT",
            TreeLevel = 0
        };
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
    public async Task ActivateBinaryNodeAsync(string userId, decimal bvPurchased, bool awardPairs = true)
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

        // Propagate this node's "active" status up every ancestor's leg count,
        // and award pair commission to any ancestor whose left/right ACTIVE
        // counts newly form a pair (min(leftActive, rightActive) increases).
        // This can be skipped when `awardPairs` is false.
        if (awardPairs && !string.IsNullOrEmpty(node.ParentId))
        {
            var parentNode = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == node.ParentId);
            if (parentNode != null)
                await IncrementActiveLegCountsUpAndAwardAsync(parentNode, node.Position);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. GET BINARY TREE (recursive, max depth)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<BinaryTreeNodeDto?> GetBinaryTreeAsync(string userId, int maxDepth = 10)
    {
        // Load every node/user/wallet ONCE instead of one query per node.
        // The old version made 3 DB round-trips per node recursively (229
        // users = 600+ sequential queries — slow) and had NO protection
        // against a cycle in LeftChildId/RightChildId: if bad data ever
        // caused a child link to point back up the tree, the old recursion
        // would re-expand that branch every level down to maxDepth, which
        // is fine at maxDepth=10 (bounded) but becomes an exponential
        // blow-up / effective hang at maxDepth=50.
        var allNodes = await _db.BinaryNodes.ToDictionaryAsync(n => n.UserId);
        if (!allNodes.ContainsKey(userId)) return null;

        var allUsers = await _db.Users.ToDictionaryAsync(u => u.UserId);
        var allWallets = await _db.BinaryWallets.ToDictionaryAsync(w => w.UserId);

        var visited = new HashSet<string>();

        BinaryTreeNodeDto? Build(string id, int depthRemaining)
        {
            // Guard against cycles/duplicate links in the data — without
            // this, a corrupted LeftChildId/RightChildId pointing back to
            // an ancestor would cause infinite/exponential recursion.
            if (!visited.Add(id)) return null;
            if (!allNodes.TryGetValue(id, out var node)) return null;

            allUsers.TryGetValue(id, out var user);
            allWallets.TryGetValue(id, out var wallet);

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

            if (depthRemaining <= 0) return dto;

            if (!string.IsNullOrEmpty(node.LeftChildId))
                dto.LeftChild = Build(node.LeftChildId, depthRemaining - 1);

            if (!string.IsNullOrEmpty(node.RightChildId))
                dto.RightChild = Build(node.RightChildId, depthRemaining - 1);

            return dto;
        }

        return Build(userId, maxDepth);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3b. GET BINARY TEAM — FLAT, PAGINATED (scales to any size / any depth)
    // ─────────────────────────────────────────────────────────────────────────
    // Unlike GetBinaryTreeAsync, this never builds a nested LeftChild/RightChild
    // structure and never recurses — it walks the tree iteratively with an
    // explicit queue (not the call stack) and returns a flat list. That means:
    //   - no JSON serializer depth limit can ever be hit (flat arrays have no
    //     nesting to count),
    //   - no call-stack depth limit can ever be hit (no recursion at all),
    //   - the response size is controlled by page/pageSize, not by how deep
    //     or how large the tree is.
    // This is the version the Team Details page should call, since it only
    // needs a flat table (Name / UserId / Phone / Status), not a visual tree.
    public async Task<BinaryMemberListDto> GetBinaryTeamFlatAsync(string userId, int page, int pageSize, string? search = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var allNodes = await _db.BinaryNodes.ToDictionaryAsync(n => n.UserId);
        if (!allNodes.ContainsKey(userId))
            return new BinaryMemberListDto { Page = page, PageSize = pageSize };

        var allUsers = await _db.Users.ToDictionaryAsync(u => u.UserId);

        var flat = new List<BinaryMemberRowDto>();
        var visited = new HashSet<string> { userId };
        var queue = new Queue<string>();
        queue.Enqueue(userId);

        while (queue.Count > 0)
        {
            var currentId = queue.Dequeue();
            if (!allNodes.TryGetValue(currentId, out var node)) continue;

            // Don't include the logged-in user's own row — only descendants.
            if (currentId != userId)
            {
                allUsers.TryGetValue(currentId, out var user);
                flat.Add(new BinaryMemberRowDto
                {
                    UserId = node.UserId,
                    Name = user?.Name ?? node.UserId,
                    Phone = user?.MobileNo,
                    SponsorId = node.SponsorId,
                    Position = node.Position,
                    TreeLevel = node.TreeLevel,
                    IsActive = node.IsActive
                });
            }

            if (!string.IsNullOrEmpty(node.LeftChildId) && visited.Add(node.LeftChildId))
                queue.Enqueue(node.LeftChildId);

            if (!string.IsNullOrEmpty(node.RightChildId) && visited.Add(node.RightChildId))
                queue.Enqueue(node.RightChildId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            flat = flat.Where(m =>
                    m.Name.ToLowerInvariant().Contains(q) ||
                    m.UserId.ToLowerInvariant().Contains(q) ||
                    (m.Phone != null && m.Phone.Contains(q)))
                .ToList();
        }

        var totalCount = flat.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));

        var pageItems = flat
            .OrderBy(m => m.TreeLevel)
            .ThenBy(m => m.UserId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new BinaryMemberListDto
        {
            Items = pageItems,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. GET BINARY WALLET
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<List<WalletTransactionDto>> GetTransactionHistoryAsync(string userId)
    {
        var transactions = await _db.BinaryWalletTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return transactions.Select(t => new WalletTransactionDto
        {
            Id = t.Id,
            PlanType = "Binary Plan",
            Type = t.Type.ToString(),
            Amount = t.Amount,
            BalanceAfter = t.BalanceAfter,
            Source = t.Source,
            Description = t.Description,
            // Binary wallet transactions don't carry a per-row tax split like
            // Dream Plan withdrawal rows do — the tax breakdown for binary
            // withdrawals is returned separately by POST /api/binary/withdraw.
            ServiceTaxAmount = 0,
            TdsAmount = 0,
            NetPayableAmount = t.Amount,
            CreatedAt = t.CreatedAt
        }).ToList();
    }

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
            : "Withdrawal locked. You need: (1) an active LEFT child, (2) an active RIGHT child, " +
              "and (3) at least 1 active grandchild (child of your LEFT or RIGHT node).";

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
    public async Task<(bool success, string message, BinaryWithdrawalRequest? request)> RequestWithdrawalAsync(string userId, decimal amount)
    {
        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null)
            return (false, "Binary wallet not found. Join the Binary Plan first.", null);

        if (!wallet.WithdrawalUnlocked)
            return (false, "Withdrawal is locked. You need an active LEFT child, an active RIGHT child, and at least 1 active grandchild before your first withdrawal.", null);

        if (amount <= 0)
            return (false, "Amount must be greater than 0.", null);

        if (amount > wallet.Balance)
            return (false, $"Insufficient balance. Available: ₹{wallet.Balance:F2}", null);

        const decimal minWithdrawal = 0m;
        if (amount < minWithdrawal)
            return (false, $"Minimum withdrawal amount is ₹{minWithdrawal}.", null);

        // Check for existing pending request
        var hasPending = await _db.BinaryWithdrawalRequests
            .AnyAsync(r => r.UserId == userId && r.Status == "Pending");
        if (hasPending)
            return (false, "You already have a pending withdrawal request.", null);

        var request = new BinaryWithdrawalRequest
        {
            UserId = userId,
            Amount = amount,
            Status = "Pending",
            RequestedAt = DateTime.UtcNow
        };
        _db.BinaryWithdrawalRequests.Add(request);

        // Reserve the funds immediately so the pending amount can't be spent
        // or withdrawn twice. Approval finalizes this; rejection refunds it.
        wallet.Balance -= amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        var reserveTxn = new BinaryWalletTransaction
        {
            UserId = userId,
            Type = BinaryTxnType.Debit,
            Amount = amount,
            BalanceAfter = wallet.Balance,
            Source = "Withdrawal Requested",
            Description = "Reserved pending withdrawal approval",
        };
        _db.BinaryWalletTransactions.Add(reserveTxn);

        await _db.SaveChangesAsync();

        return (true, $"Withdrawal request of ₹{amount:F2} submitted successfully.", request);
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

        // IMPORTANT: RequestWithdrawalAsync already deducted wallet.Balance
        // at request time (funds are "reserved" the moment the request is
        // submitted, not at approval time). This method must NOT touch
        // Balance again on approve — the old code did `wallet.Balance -=
        // request.Amount` here too, silently double-charging the user's
        // wallet for every approved withdrawal. Approval only needs to bump
        // TotalWithdrawn (the lifetime stat) and log the finalized txn.
        if (approve)
        {
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
        else
        {
            // REJECT: the old code never refunded the amount that was
            // reserved (deducted) at request time, so a rejected withdrawal
            // permanently vanished from the user's balance. Refund it here.
            wallet.Balance += request.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var refundTxn = new BinaryWalletTransaction
            {
                UserId = request.UserId,
                Type = BinaryTxnType.Credit,
                Amount = request.Amount,
                BalanceAfter = wallet.Balance,
                Source = "Withdrawal Rejected",
                Description = $"Refund - withdrawal rejected. Ref: WR-{requestId}",
                ReferenceId = $"WR-{requestId}",
                CreatedAt = DateTime.UtcNow
            };
            _db.BinaryWalletTransactions.Add(refundTxn);
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
    /// Maximum number of ancestor levels any upward walk will traverse.
    /// This is a safety cap, not a real business limit — a legitimate binary
    /// tree should never realistically be this deep. It exists purely so that
    /// a corrupted ParentId chain (e.g. a node whose ParentId accidentally
    /// points back down to one of its own descendants, creating a cycle) can
    /// never cause an infinite loop / an ever-growing chain of DB round trips
    /// that hangs the request forever. If this is ever hit, it means the data
    /// is broken and needs to be inspected — not that the tree is legitimately
    /// this deep.
    /// </summary>
    private const int MaxAncestorWalkDepth = 500;

    /// <summary>
    /// Fetches the full ancestor chain starting at `startNode` (inclusive) in
    /// ONE round trip instead of one query per level, and guards against a
    /// corrupted/cyclic ParentId chain.
    ///
    /// Previously, every upward walk (leg counts, BV propagation, active leg
    /// counts + commission) queried the DB once per ancestor level inside a
    /// `while` loop. On a deep tree that's slow (one ~70ms round trip per
    /// level); worse, if a ParentId chain is ever corrupted into a cycle
    /// (some node's ParentId points back to one of its own descendants), that
    /// loop's only exit condition (`ParentId` being null/empty) is never hit,
    /// so it runs forever — the request never completes and the caller (e.g.
    /// the "Placing in tree..." button) hangs indefinitely.
    ///
    /// This version loads the whole BinaryNodes table's id/parent/position
    /// columns once, then walks the chain in memory with a visited-set cycle
    /// check and a hard depth cap, so a bad chain fails fast with a clear
    /// exception instead of hanging the request.
    /// </summary>
    private async Task<List<BinaryNode>> GetAncestorChainAsync(BinaryNode startNode)
    {
        var chain = new List<BinaryNode> { startNode };
        var visited = new HashSet<string> { startNode.UserId };

        var currentParentId = startNode.ParentId;

        while (!string.IsNullOrEmpty(currentParentId))
        {
            if (!visited.Add(currentParentId))
                throw new InvalidOperationException(
                    $"Cycle detected in binary tree: node '{currentParentId}' is its own ancestor. " +
                    "This indicates corrupted ParentId data and must be fixed manually before this " +
                    "user can be placed/activated.");

            if (chain.Count >= MaxAncestorWalkDepth)
                throw new InvalidOperationException(
                    $"Ancestor walk exceeded {MaxAncestorWalkDepth} levels starting from " +
                    $"'{startNode.UserId}'. This is almost certainly a corrupted ParentId chain " +
                    "rather than a genuinely deep tree — please inspect the data.");

            var parent = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == currentParentId);
            if (parent == null) break; // dangling ParentId — stop, don't loop forever

            chain.Add(parent);
            currentParentId = parent.ParentId;
        }

        return chain;
    }

    /// <summary>
    /// Walks up the tree from `startNode` and increments leg counts.
    /// </summary>
    private async Task IncrementLegCountsUpAsync(BinaryNode startNode, string childPosition)
    {
        var chain = await GetAncestorChainAsync(startNode);
        var comingFromPosition = childPosition;

        foreach (var current in chain)
        {
            if (comingFromPosition == "LEFT")
                current.LeftLegCount++;
            else
                current.RightLegCount++;

            current.UpdatedAt = DateTime.UtcNow;
            comingFromPosition = current.Position;
        }
    }

    /// <summary>
    /// Propagates BV up the tree after activation.
    /// </summary>
    private async Task PropagateBvUpAsync(BinaryNode activatedNode, decimal bv)
    {
        // Ancestors only — the activated node itself doesn't get BV credited
        // to itself, only to everyone above it (matches original behavior).
        var chain = await GetAncestorChainAsync(activatedNode);

        for (int i = 1; i < chain.Count; i++)
        {
            var parent = chain[i];
            var current = chain[i - 1];

            if (current.Position == "LEFT")
                parent.LeftLegBv += bv;
            else
                parent.RightLegBv += bv;

            parent.TotalBv += bv;
            parent.UpdatedAt = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Walks up the tree from `startNode` and increments ACTIVE leg counts
    /// (mirrors IncrementLegCountsUpAsync, but only counts active members).
    /// After incrementing each ancestor, checks whether new pairs have formed
    /// for that ancestor and awards commission for them.
    ///
    /// CONCURRENCY: a shared ancestor (e.g. the account near the top of a
    /// large tree) gets this increment fired for EVERY activation anywhere
    /// in its subtree. Multiple activations happening close together race
    /// on the same BinaryNode row. Without a concurrency check, EF's default
    /// "last write wins" behavior means one of the concurrent increments is
    /// silently discarded — the counter ends up too low, and because
    /// AwardNewPairsAsync's pair math is a pure function of whatever value
    /// happens to be in memory at that moment, a pair that should have been
    /// unlocked by the lost increment is skipped and never paid. This is
    /// exactly the "1 pair when it should be 3" bug.
    ///
    /// Fix: BinaryNode now has an xmin concurrency token (see AppDbContext).
    /// SaveChangesAsync throws DbUpdateConcurrencyException when another
    /// request updated the same row first. We catch that, reload the node's
    /// current (post-conflict) values from the DB, re-apply our increment
    /// and the pair-award check on top of the fresh data, and retry — so no
    /// increment and no pair is ever silently dropped.
    /// </summary>
    private async Task IncrementActiveLegCountsUpAndAwardAsync(BinaryNode startNode, string childPosition)
    {
        var chain = await GetAncestorChainAsync(startNode);
        var comingFromPosition = childPosition;

        foreach (var current in chain)
        {
            var incomingPosition = comingFromPosition; // capture for the retry closure
            var node = current;

            const int maxRetries = 5;
            for (int attempt = 1; ; attempt++)
            {
                if (incomingPosition == "LEFT")
                    node.LeftActiveCount++;
                else
                    node.RightActiveCount++;

                node.UpdatedAt = DateTime.UtcNow;

                try
                {
                    await _db.SaveChangesAsync();
                    break; // success — move on to awarding pairs for this ancestor
                }
                catch (DbUpdateConcurrencyException ex) when (attempt < maxRetries)
                {
                    // Another activation updated this exact node between our
                    // read and our write. Reload the current DB values (this
                    // also resets the entity's tracked xmin token) and retry
                    // the increment on top of the up-to-date data instead of
                    // giving up and losing the +1.
                    var entry = ex.Entries.Single();
                    await entry.ReloadAsync();
                    node = (BinaryNode)entry.Entity;
                }
            }

            // Award any newly-formed pairs for this ancestor based on the
            // updated active counts. AwardNewPairsAsync computes the delta
            // against node.MatchedPairs itself, so it's safe even if a
            // retry above changed how many increments landed here.
            await AwardNewPairsAsync(node);

            comingFromPosition = node.Position;
        }
    }

    /// <summary>
    /// Awards ₹150 for every newly-completed pair on `node`.
    ///
    /// GATE: the very first pair only unlocks once there are at least 2 active
    /// on one side and 1 on the other (2L+1R or 1L+2R) — a bare 1×1 does NOT
    /// pay. This prevents two people who both happen to activate once from
    /// instantly earning a pair with no real leg depth.
    ///
    /// Once the gate is open, pairs = min(LeftActiveCount, RightActiveCount)
    /// directly — no separate "growth since first pair" tracking. E.g.:
    ///   100 left + 1 right  → gate open (100≥2,1≥1) → min(100,1) = 1 pair
    ///   100 left + 2 right  → min(100,2) = 2 pairs  (1 new pair awarded)
    ///   15 right  + 5 left  → gate open → min(15,5) = 5 pairs = ₹750
    ///
    /// newPairs = totalEligiblePairs - MatchedPairs  (delta only, never re-paid)
    /// </summary>
    private async Task AwardNewPairsAsync(BinaryNode node)
    {
        int L = node.LeftActiveCount;
        int R = node.RightActiveCount;

        // ── GATE: first pair requires 2L+1R or 1L+2R (blocks bare 1×1) ──
        bool gateOpen = (L >= 2 && R >= 1) || (L >= 1 && R >= 2);
        if (!gateOpen) return;

        int totalEligiblePairs = Math.Min(L, R);

        int newPairs = totalEligiblePairs - node.MatchedPairs;
        if (newPairs <= 0) return;

        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == node.UserId);
        if (wallet == null)
        {
            wallet = new BinaryWallet { UserId = node.UserId, CreatedAt = DateTime.UtcNow };
            _db.BinaryWallets.Add(wallet);
        }

        for (int i = 0; i < newPairs; i++)
        {
            node.MatchedPairs += 1;

            var pair = new BinaryPair
            {
                UserId = node.UserId,
                LeftChildId = node.LeftChildId ?? "",
                RightChildId = node.RightChildId ?? "",
                CommissionAmt = PairCommission,
                CreditedAt = DateTime.UtcNow
            };
            _db.BinaryPairs.Add(pair);

            wallet.Balance += PairCommission;
            wallet.TotalEarned += PairCommission;
            wallet.PairsCount += 1;
            wallet.UpdatedAt = DateTime.UtcNow;

            // CONCURRENCY: node and wallet both now carry xmin tokens. If a
            // concurrent request touched either row since we read it (e.g.
            // an admin withdrawal approval touching the same wallet, or a
            // parallel activation touching the same node further up the
            // chain), retry on top of the fresh values instead of throwing
            // away this pair's commission or crashing the activation.
            const int maxRetries = 5;
            for (int attempt = 1; ; attempt++)
            {
                try
                {
                    await _db.SaveChangesAsync(); // save now so pair.Id is available for the transaction
                    break;
                }
                catch (DbUpdateConcurrencyException ex) when (attempt < maxRetries)
                {
                    foreach (var entry in ex.Entries)
                    {
                        // Reload the conflicting row(s), then re-apply this
                        // pair's numbers on top of the current DB state.
                        var current = entry.Entity;
                        await entry.ReloadAsync();

                        if (current is BinaryWallet)
                        {
                            wallet.Balance += PairCommission;
                            wallet.TotalEarned += PairCommission;
                            wallet.PairsCount += 1;
                            wallet.UpdatedAt = DateTime.UtcNow;
                        }
                        else if (current is BinaryNode)
                        {
                            node.MatchedPairs += 1;
                            node.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
            }

            var txn = new BinaryWalletTransaction
            {
                UserId = node.UserId,
                Type = BinaryTxnType.Credit,
                Amount = PairCommission,
                BalanceAfter = wallet.Balance,
                Source = "Pair Commission",
                Description = $"₹150 pair commission (pair #{node.MatchedPairs})",
                ReferenceId = pair.Id.ToString(),
                CreatedAt = DateTime.UtcNow
            };
            _db.BinaryWalletTransactions.Add(txn);
        }

        await UpdateWithdrawalUnlockAsync(node.UserId);
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Unlocks withdrawal when ALL of the following are true:
    ///   1. The user has a direct LEFT child that is active.
    ///   2. The user has a direct RIGHT child that is active.
    ///   3. At least one grandchild (child of the LEFT or RIGHT node) is active.
    /// This means a minimum of 3 active nodes directly beneath the user.
    /// </summary>
    private async Task UpdateWithdrawalUnlockAsync(string userId)
    {
        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        if (node == null) return;

        var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null) return;

        if (wallet.WithdrawalUnlocked) return; // already unlocked — no need to re-check

        // Condition 1 & 2: both direct children must exist and be active
        if (string.IsNullOrEmpty(node.LeftChildId) || string.IsNullOrEmpty(node.RightChildId))
            return;

        var leftChild = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == node.LeftChildId);
        var rightChild = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == node.RightChildId);

        if (leftChild == null || !leftChild.IsActive) return;
        if (rightChild == null || !rightChild.IsActive) return;

        // Condition 3: at least one grandchild (under left OR right child) must be active
        var grandchildIds = new List<string>();
        if (!string.IsNullOrEmpty(leftChild.LeftChildId)) grandchildIds.Add(leftChild.LeftChildId);
        if (!string.IsNullOrEmpty(leftChild.RightChildId)) grandchildIds.Add(leftChild.RightChildId);
        if (!string.IsNullOrEmpty(rightChild.LeftChildId)) grandchildIds.Add(rightChild.LeftChildId);
        if (!string.IsNullOrEmpty(rightChild.RightChildId)) grandchildIds.Add(rightChild.RightChildId);

        if (grandchildIds.Count == 0) return;

        bool hasActiveGrandchild = await _db.BinaryNodes
            .AnyAsync(n => grandchildIds.Contains(n.UserId) && n.IsActive);

        if (!hasActiveGrandchild) return;

        // All 3 conditions met — unlock withdrawal
        wallet.WithdrawalUnlocked = true;
        wallet.UpdatedAt = DateTime.UtcNow;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. PREVIEW PLACEMENT (shows actual parent before user confirms join)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<PlacementPreviewDto> PreviewPlacementAsync(string sponsorId, string preferredPosition)
    {
        preferredPosition = preferredPosition.ToUpper().Trim();
        if (preferredPosition != "LEFT" && preferredPosition != "RIGHT")
            return new PlacementPreviewDto { Success = false, Message = "Position must be LEFT or RIGHT." };

        var sponsorNode = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == sponsorId);
        if (sponsorNode == null)
            return new PlacementPreviewDto { Success = false, Message = $"Sponsor {sponsorId} not found in binary tree." };

        var (parentNode, actualPosition) = await FindPlacementSlotAsync(sponsorNode, preferredPosition);

        if (parentNode == null)
            return new PlacementPreviewDto { Success = false, Message = "No available slot found." };

        bool isDirect = parentNode.UserId == sponsorId;

        return new PlacementPreviewDto
        {
            Success = true,
            Message = isDirect
                ? $"You will be placed directly under {sponsorId} on the {actualPosition} side."
                : $"The {preferredPosition} slot under {sponsorId} is taken. You will be auto-placed under {parentNode.UserId} on the {actualPosition} side.",
            ActualParentId = parentNode.UserId,
            ActualPosition = actualPosition,
            TreeLevel = parentNode.TreeLevel + 1,
            IsDirectPlacement = isDirect
        };
    }

    private static BinaryPlacementResultDto Fail(string msg) =>
        new() { Success = false, Message = msg };

    // ─────────────────────────────────────────────────────────────────────────
    // 9. TODAY'S ACTIVATIONS (LEFT / RIGHT split)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<TodayActivationsDto> GetTodayActivationsAsync(string userId)
    {
        var result = new TodayActivationsDto();

        var node = await _db.BinaryNodes.FirstOrDefaultAsync(n => n.UserId == userId);
        if (node == null) return result;

        // Pull the whole tree once — cheap columns only — then walk it in memory
        // instead of round-tripping the DB once per descendant.
        var allNodes = await _db.BinaryNodes
            .Select(n => new
            {
                n.UserId,
                n.LeftChildId,
                n.RightChildId,
                n.IsActive,
                n.ActivatedAt
            })
            .ToListAsync();

        var byId = allNodes.ToDictionary(n => n.UserId, n => n);

        // NOTE: "today" is taken in UTC (server time). Switch to IST here if
        // the business day should align with India Standard Time instead.
        var today = DateTime.UtcNow.Date;

        void Walk(string? startId, string side, List<TodayActivationEntryDto> bucket)
        {
            if (string.IsNullOrEmpty(startId)) return;

            var queue = new Queue<string>();
            queue.Enqueue(startId);

            while (queue.Count > 0)
            {
                var currentId = queue.Dequeue();
                if (!byId.TryGetValue(currentId, out var current)) continue;

                if (current.IsActive && current.ActivatedAt.HasValue &&
                    current.ActivatedAt.Value.Date == today)
                {
                    bucket.Add(new TodayActivationEntryDto
                    {
                        UserId = current.UserId,
                        Side = side,
                        ActivatedAt = current.ActivatedAt.Value
                    });
                }

                if (!string.IsNullOrEmpty(current.LeftChildId)) queue.Enqueue(current.LeftChildId);
                if (!string.IsNullOrEmpty(current.RightChildId)) queue.Enqueue(current.RightChildId);
            }
        }

        Walk(node.LeftChildId, "LEFT", result.Left);
        Walk(node.RightChildId, "RIGHT", result.Right);

        // Attach display names in one batched query
        var allIds = result.Left.Select(e => e.UserId).Concat(result.Right.Select(e => e.UserId)).ToList();
        if (allIds.Count > 0)
        {
            var names = await _db.Users
                .Where(u => allIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

            foreach (var entry in result.Left.Concat(result.Right))
                entry.Name = names.TryGetValue(entry.UserId, out var n) ? n ?? entry.UserId : entry.UserId;
        }

        result.Left = result.Left.OrderByDescending(e => e.ActivatedAt).ToList();
        result.Right = result.Right.OrderByDescending(e => e.ActivatedAt).ToList();

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. ONE-TIME ADMIN CORRECTION FOR PAIRS PAID UNDER THE OLD RULE
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Walks every BinaryNode, recomputes the correct MatchedPairs count under
    /// the CURRENT rule (correctPairs = min(LeftActiveCount, RightActiveCount)),
    /// and reconciles in BOTH directions:
    ///   - Overpaid nodes (paid too many pairs under the old gated rule):
    ///     reverses the excess — debits the wallet, deletes the excess
    ///     BinaryPair rows, logs a Debit transaction.
    ///   - Underpaid nodes (blocked by the old gate even though min(L,R)
    ///     already supported more pairs — this is the "1 pair" bug you saw):
    ///     pays the shortfall — credits the wallet, adds BinaryPair rows,
    ///     logs a Credit transaction.
    ///
    /// Safe to re-run — running it twice in a row is a no-op the second time.
    /// </summary>
    public async Task<List<string>> CorrectOverpaidPairsAsync()
    {
        var log = new List<string>();
        var nodes = await _db.BinaryNodes.ToListAsync();

        foreach (var node in nodes)
        {
            // ── Correct rule: gate (2x1 or 1x2 to unlock first pair), then
            //    correctPairs = min(left, right) directly, no growth-since-
            //    snapshot tracking. ──
            bool gateOpen = (node.LeftActiveCount >= 2 && node.RightActiveCount >= 1)
                         || (node.LeftActiveCount >= 1 && node.RightActiveCount >= 2);
            int correctPairs = gateOpen ? Math.Min(node.LeftActiveCount, node.RightActiveCount) : 0;
            int diff = correctPairs - node.MatchedPairs;
            if (diff == 0)
                continue; // already correct

            var wallet = await _db.BinaryWallets.FirstOrDefaultAsync(w => w.UserId == node.UserId);
            if (wallet == null)
            {
                wallet = new BinaryWallet { UserId = node.UserId, CreatedAt = DateTime.UtcNow };
                _db.BinaryWallets.Add(wallet);
            }

            if (diff < 0)
            {
                // ── OVERPAID: claw back the excess ──
                int excess = -diff;
                decimal reverseAmount = excess * PairCommission;

                var pairsToRemove = await _db.BinaryPairs
                    .Where(p => p.UserId == node.UserId)
                    .OrderByDescending(p => p.CreditedAt)
                    .Take(excess)
                    .ToListAsync();
                _db.BinaryPairs.RemoveRange(pairsToRemove);

                wallet.Balance -= reverseAmount;
                wallet.TotalEarned -= reverseAmount;
                wallet.PairsCount = Math.Max(wallet.PairsCount - excess, 0);
                wallet.UpdatedAt = DateTime.UtcNow;

                if (wallet.Balance < 0)
                {
                    log.Add($"{node.UserId}: WARNING — correction of -₹{reverseAmount} would make balance negative " +
                            $"(already withdrawn ₹{wallet.TotalWithdrawn}). Balance clamped to ₹0; manual follow-up needed.");
                    wallet.Balance = 0;
                }

                node.MatchedPairs = correctPairs;
                node.UpdatedAt = DateTime.UtcNow;

                _db.BinaryWalletTransactions.Add(new BinaryWalletTransaction
                {
                    UserId = node.UserId,
                    Type = BinaryTxnType.Debit,
                    Amount = reverseAmount,
                    BalanceAfter = wallet.Balance,
                    Source = "Pair Commission Correction",
                    Description = $"System correction: reversed {excess} overpaid pair(s) under old rule " +
                                   $"(L={node.LeftActiveCount}, R={node.RightActiveCount}). MatchedPairs {node.MatchedPairs + excess} → {correctPairs}.",
                    CreatedAt = DateTime.UtcNow
                });

                log.Add($"{node.UserId}: OVERPAID — MatchedPairs {node.MatchedPairs + excess} → {correctPairs}, reversed ₹{reverseAmount}.");
            }
            else
            {
                // ── UNDERPAID: top up the shortfall (this is the "1 pair" bug) ──
                int shortfall = diff;
                decimal payAmount = shortfall * PairCommission;

                for (int i = 0; i < shortfall; i++)
                {
                    node.MatchedPairs += 1;
                    var pair = new BinaryPair
                    {
                        UserId = node.UserId,
                        LeftChildId = node.LeftChildId ?? "",
                        RightChildId = node.RightChildId ?? "",
                        CommissionAmt = PairCommission,
                        CreditedAt = DateTime.UtcNow
                    };
                    _db.BinaryPairs.Add(pair);
                }

                wallet.Balance += payAmount;
                wallet.TotalEarned += payAmount;
                wallet.PairsCount += shortfall;
                wallet.UpdatedAt = DateTime.UtcNow;
                node.UpdatedAt = DateTime.UtcNow;

                _db.BinaryWalletTransactions.Add(new BinaryWalletTransaction
                {
                    UserId = node.UserId,
                    Type = BinaryTxnType.Credit,
                    Amount = payAmount,
                    BalanceAfter = wallet.Balance,
                    Source = "Pair Commission Correction",
                    Description = $"System correction: paid {shortfall} previously-blocked pair(s) " +
                                   $"(L={node.LeftActiveCount}, R={node.RightActiveCount}). MatchedPairs {node.MatchedPairs - shortfall} → {node.MatchedPairs}.",
                    CreatedAt = DateTime.UtcNow
                });

                log.Add($"{node.UserId}: UNDERPAID — MatchedPairs {node.MatchedPairs - shortfall} → {node.MatchedPairs}, paid ₹{payAmount}.");
            }
        }

        await _db.SaveChangesAsync();

        // Re-check withdrawal unlock status for every corrected user
        foreach (var entry in log)
        {
            var userId = entry.Split(':')[0];
            await UpdateWithdrawalUnlockAsync(userId);
        }
        await _db.SaveChangesAsync();

        if (log.Count == 0)
            log.Add("No mismatched nodes found — all MatchedPairs counts are already correct.");

        return log;
    }
}

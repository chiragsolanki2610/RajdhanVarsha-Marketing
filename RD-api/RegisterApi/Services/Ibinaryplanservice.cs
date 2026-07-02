using RegisterApi.DTOs;

namespace RegisterApi.Services;

public interface IBinaryPlanService
{
    /// <summary>
    /// Places RD0001 as the root node of the binary tree.
    /// No sponsor or position is required — this is the tree's origin point.
    /// </summary>
    Task<BinaryPlacementResultDto> PlaceRootNodeAsync(string rootUserId);

    /// <summary>
    /// Places a newly activated user into the binary tree under their sponsor.
    /// sponsorId = the user who referred them.
    /// preferredPosition = "LEFT" or "RIGHT" (the slot the SPONSOR wants them in).
    /// If that slot is already taken, we auto-place in the first available slot
    /// using BFS (breadth-first search down that leg).
    /// </summary>
    Task<BinaryPlacementResultDto> PlaceUserInBinaryTreeAsync(
        string newUserId, string sponsorId, string preferredPosition);

    /// <summary>
    /// Called after a user purchases ≥600 BV of products for the Binary Plan.
    /// Activates their node, updates BV up the tree. By default this also
    /// distributes pair commissions; pass `awardPairs=false` to skip those
    /// (useful when you don't want commissions to be paid on certain activations).
    /// </summary>
    Task ActivateBinaryNodeAsync(string userId, decimal bvPurchased, bool awardPairs = true);

    /// <summary>Fetches the binary tree rooted at userId (up to maxDepth levels).</summary>
    Task<BinaryTreeNodeDto?> GetBinaryTreeAsync(string userId, int maxDepth = 10);

    /// <summary>Gets the user's binary wallet summary.</summary>
    Task<BinaryWalletDto> GetBinaryWalletAsync(string userId);

    /// <summary>
    /// Requests a withdrawal from the binary wallet.
    /// Fails if WithdrawalUnlocked = false (less than 3 downlines).
    /// </summary>
    Task<(bool success, string message)> RequestWithdrawalAsync(string userId, decimal amount);

    /// <summary>Admin: approve or reject a binary withdrawal request.</summary>
    Task<(bool success, string message)> ProcessWithdrawalAsync(int requestId, bool approve, string adminNote);


    //new----------------------------------------------------------------------------------
    Task<PlacementPreviewDto> PreviewPlacementAsync(string sponsorId, string preferredPosition);

    /// <summary>
    /// ONE-TIME ADMIN CORRECTION: Recomputes the correct number of matched pairs
    /// for every node under the current pairing rule (equal-sides => n-1,
    /// unequal => min(left,right)), and reverses any commission that was
    /// overpaid under the old rule (e.g. a 2-2 node that was wrongly paid for
    /// 2 pairs instead of 1). Safe to run multiple times — it only ever debits
    /// the exact excess, never touches correctly-paid pairs, and does nothing
    /// if a node's MatchedPairs is already correct or under-paid.
    /// </summary>
    Task<List<string>> CorrectOverpaidPairsAsync();

    /// <summary>
    /// Walks the current user's entire binary downline (both legs) and returns
    /// the IDs that got their Binary Plan ID activated today, split by which
    /// side (LEFT/RIGHT) of the current user they fall under.
    /// </summary>
    Task<TodayActivationsDto> GetTodayActivationsAsync(string userId);
}
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
    /// Activates their node, updates BV up the tree, distributes pair commissions.
    /// </summary>
    Task ActivateBinaryNodeAsync(string userId, decimal bvPurchased);

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
}

namespace RegisterApi.DTOs;

// ── Shared Item DTO (used by both Dream Plan and Binary Plan) ─────────────────

public class PlanItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public class JoinBinaryPlanDto
{
    public string SponsorId { get; set; } = string.Empty;
    public string PreferredPosition { get; set; } = "LEFT";
}

public class BinaryActivationDto
{
    public List<PlanItemDto> Items { get; set; } = new();
}

public class BinaryWithdrawalRequestDto
{
    public decimal Amount { get; set; }
}

public class ProcessBinaryWithdrawalDto
{
    public bool Approve { get; set; }
    public string AdminNote { get; set; } = string.Empty;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

public class BinaryPlacementResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ParentId { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public int TreeLevel { get; set; }
}

public class BinaryTreeNodeDto
{
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string Position { get; set; } = string.Empty;
    public int TreeLevel { get; set; }
    public bool IsActive { get; set; }
    public string IdStatus { get; set; } = "inactive";
    public decimal TotalBv { get; set; }
    public int PairsCount { get; set; }

    public BinaryTreeNodeDto? LeftChild { get; set; }
    public BinaryTreeNodeDto? RightChild { get; set; }
}

public class BinaryWalletDto
{
    public string UserId { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal TotalEarned { get; set; }
    public decimal TotalWithdrawn { get; set; }
    public int PairsCount { get; set; }
    public bool WithdrawalUnlocked { get; set; }
    public string WithdrawalUnlockMessage { get; set; } = string.Empty;
    public List<BinaryTxnDto> RecentTransactions { get; set; } = new();
}

public class BinaryTxnDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BinaryNodeStatusDto
{
    public bool IsInBinaryPlan { get; set; }
    public bool IsActive { get; set; }
    public string? Position { get; set; }
    public string? ParentId { get; set; }
    public string? LeftChildId { get; set; }
    public string? RightChildId { get; set; }
    public int TreeLevel { get; set; }
    public int LeftLegCount { get; set; }
    public int RightLegCount { get; set; }
    public int TotalDownlineCount { get; set; }
    public bool WithdrawalUnlocked { get; set; }
    public int PairsCompleted { get; set; }
    public decimal WalletBalance { get; set; }
}
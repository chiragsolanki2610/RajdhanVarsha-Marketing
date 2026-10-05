using System.ComponentModel.DataAnnotations;

namespace RegisterApi.DTOs
{
    // The wallet credit is this % LESS than the DP total of the returned goods.
    public static class ReturnRules
    {
        public const decimal DeductionPercent = 6m;

        public static (decimal Deduction, decimal Credit) Calculate(decimal subTotalDp)
        {
            var deduction = Math.Round(subTotalDp * DeductionPercent / 100m, 2);
            return (deduction, subTotalDp - deduction);
        }
    }

    // ---- POST /api/PickupCenter/returns ----
    public class ReturnItemSubmissionDto
    {
        [Required] public int ProductId { get; set; }
        [Required] public int Quantity { get; set; }
    }

    public class SubmitReturnRequestDto
    {
        [Required] public List<ReturnItemSubmissionDto> Items { get; set; } = new();
        public string? Reason { get; set; }
    }

    // ---- Responses ----
    public class ReturnItemDto
    {
        public int ProductId { get; set; }
        public string ProductNo { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Dp { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class PickupCenterReturnDto
    {
        public int Id { get; set; }
        public string RequestNo { get; set; } = string.Empty;   // RET-000012
        public string PucId { get; set; } = string.Empty;
        public string CenterName { get; set; } = string.Empty;
        public List<ReturnItemDto> Items { get; set; } = new();
        public decimal SubTotalDp { get; set; }
        public decimal DeductionPercent { get; set; }
        public decimal DeductionAmount { get; set; }
        public decimal CreditAmount { get; set; }
        public string? Reason { get; set; }
        public string Status { get; set; } = string.Empty;      // Pending | Approved | Rejected
        public DateTime RequestedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    // ---- Admin: PUT /api/Admin/pickup-center-returns/{id}/status ----
    public class ReturnStatusUpdateDto
    {
        [Required] public string Status { get; set; } = string.Empty; // "Approved" | "Rejected"
        public string? RejectionReason { get; set; }
    }

    // ---- Wallet ----
    public class PickupCenterWalletDto
    {
        public decimal Balance { get; set; }
        public decimal TotalEarned { get; set; }
        public decimal TotalWithdrawn { get; set; }
    }

    public class PickupCenterWalletTransactionDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;   // Credit | Debit
        public decimal Amount { get; set; }
        public decimal BalanceAfter { get; set; }
        public string Source { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ReferenceId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

using System.Collections.Generic;
using System.Threading.Tasks;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Services;

public interface IWalletService
{
    // --- Reads ---
    Task<List<WalletDto>> GetWalletsAsync(string userId);
    Task<List<WalletTransactionDto>> GetTransactionHistoryAsync(string userId, string? planType = null);

    // --- Crediting earnings (call this from wherever an earning event happens:
    // referral bonus, BV matching, a scheduled job, etc.) ---
    Task<WalletTransaction> CreditAsync(string userId, string planType, decimal amount, string source, string? description = null, string? referenceId = null);

    // --- Withdrawals (Dream Plan / regular) ---
    Task<WithdrawalRequestDto> RequestWithdrawalAsync(string userId, string planType, decimal amount);

    // userId == null -> admin view (all users). Pass a userId to scope the
    // results to a single user's own requests (used by the user-facing
    // GET /api/wallet/withdrawals endpoint so the wallet page can read the
    // real Status field instead of guessing it from transaction text).
    Task<List<WithdrawalRequestDto>> GetWithdrawalRequestsAsync(WithdrawalStatus? status = null, string? userId = null);
    Task<WithdrawalRequestDto> ApproveWithdrawalAsync(int requestId, string adminUserId, string? remarks = null);
    Task<WithdrawalRequestDto> RejectWithdrawalAsync(int requestId, string adminUserId, string? remarks = null);

    // --- Withdrawals (Binary Plan) ---
    Task<List<BinaryWithdrawalRequestDto>> GetBinaryWithdrawalRequestsAsync(string? status = null, string? userId = null);
    Task<BinaryWithdrawalRequestDto> ApproveBinaryWithdrawalAsync(int requestId, string adminUserId, string? remarks = null);
    Task<BinaryWithdrawalRequestDto> RejectBinaryWithdrawalAsync(int requestId, string adminUserId, string? remarks = null);
}

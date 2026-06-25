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

    // --- Withdrawals ---
    Task<WithdrawalRequestDto> RequestWithdrawalAsync(string userId, string planType, decimal amount);
    Task<List<WithdrawalRequestDto>> GetWithdrawalRequestsAsync(WithdrawalStatus? status = null);
    Task<WithdrawalRequestDto> ApproveWithdrawalAsync(int requestId, string adminUserId, string? remarks = null);
    Task<WithdrawalRequestDto> RejectWithdrawalAsync(int requestId, string adminUserId, string? remarks = null);
}
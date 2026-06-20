using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Services;

public class WalletService : IWalletService
{
    private readonly AppDbContext _db;

    public WalletService(AppDbContext db)
    {
        _db = db;
    }

    // ---------- Helpers ----------

    private async Task<Wallet> GetOrCreateWalletAsync(string userId, string planType)
    {
        var wallet = await _db.Wallets
            .FirstOrDefaultAsync(w => w.UserId == userId && w.PlanType == planType);

        if (wallet == null)
        {
            wallet = new Wallet { UserId = userId, PlanType = planType };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync();
        }

        return wallet;
    }

    private static WalletDto ToDto(Wallet w) => new()
    {
        PlanType = w.PlanType,
        Balance = w.Balance,
        TotalEarned = w.TotalEarned,
        TotalWithdrawn = w.TotalWithdrawn,
        MinWithdrawalAmount = WalletRules.GetMinWithdrawal(w.PlanType)
    };

    private static WalletTransactionDto ToDto(WalletTransaction t) => new()
    {
        Id = t.Id,
        PlanType = t.PlanType,
        Type = t.Type.ToString(),
        Amount = t.Amount,
        BalanceAfter = t.BalanceAfter,
        Source = t.Source,
        Description = t.Description,
        CreatedAt = t.CreatedAt
    };

    private static WithdrawalRequestDto ToDto(WithdrawalRequest r, string userName) => new()
    {
        Id = r.Id,
        UserId = r.UserId,
        UserName = userName,
        PlanType = r.PlanType,
        Amount = r.Amount,
        Status = r.Status.ToString(),
        RequestedAt = r.RequestedAt,
        ProcessedAt = r.ProcessedAt,
        AdminRemarks = r.AdminRemarks
    };

    // ---------- Wallet reads ----------

    public async Task<List<WalletDto>> GetWalletsAsync(string userId)
    {
        var wallets = await _db.Wallets
            .Where(w => w.UserId == userId)
            .ToListAsync();

        return wallets.Select(ToDto).ToList();
    }

    public async Task<List<WalletTransactionDto>> GetTransactionHistoryAsync(string userId, string? planType = null)
    {
        var query = _db.WalletTransactions.Where(t => t.UserId == userId);

        if (!string.IsNullOrEmpty(planType))
            query = query.Where(t => t.PlanType == planType);

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return transactions.Select(ToDto).ToList();
    }

    // ---------- Crediting earnings ----------

    public async Task<WalletTransaction> CreditAsync(string userId, string planType, decimal amount, string source, string? description = null, string? referenceId = null)
    {
        if (amount <= 0)
            throw new ArgumentException("Credit amount must be greater than zero.");

        var wallet = await GetOrCreateWalletAsync(userId, planType);

        wallet.Balance += amount;
        wallet.TotalEarned += amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        var transaction = new WalletTransaction
        {
            UserId = userId,
            PlanType = planType,
            Type = WalletTransactionType.Credit,
            Amount = amount,
            BalanceAfter = wallet.Balance,
            Source = source,
            Description = description,
            ReferenceId = referenceId
        };

        _db.WalletTransactions.Add(transaction);
        await _db.SaveChangesAsync();

        return transaction;
    }

    // ---------- Withdrawals ----------

    public async Task<WithdrawalRequestDto> RequestWithdrawalAsync(string userId, string planType, decimal amount)
    {
        var minAmount = WalletRules.GetMinWithdrawal(planType);

        if (amount < minAmount)
            throw new InvalidOperationException($"Minimum withdrawal amount for {planType} is {minAmount}.");

        var wallet = await GetOrCreateWalletAsync(userId, planType);

        if (wallet.Balance < amount)
            throw new InvalidOperationException("Insufficient wallet balance.");

        await using var dbTransaction = await _db.Database.BeginTransactionAsync();

        try
        {
            // Reserve the funds immediately so the user can't request the same
            // balance twice while this request is still pending approval.
            wallet.Balance -= amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var request = new WithdrawalRequest
            {
                UserId = userId,
                PlanType = planType,
                Amount = amount,
                Status = WithdrawalStatus.Pending
            };
            _db.WithdrawalRequests.Add(request);
            await _db.SaveChangesAsync();

            var walletTxn = new WalletTransaction
            {
                UserId = userId,
                PlanType = planType,
                Type = WalletTransactionType.Debit,
                Amount = amount,
                BalanceAfter = wallet.Balance,
                Source = "Withdrawal Request",
                Description = "Funds reserved pending admin approval",
                ReferenceId = request.Id.ToString()
            };
            _db.WalletTransactions.Add(walletTxn);
            await _db.SaveChangesAsync();

            await dbTransaction.CommitAsync();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            return ToDto(request, user?.Name ?? userId);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<WithdrawalRequestDto>> GetWithdrawalRequestsAsync(WithdrawalStatus? status = null)
    {
        var query = _db.WithdrawalRequests.AsQueryable();

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        var requests = await query
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();

        var userIds = requests.Select(r => r.UserId).Distinct().ToList();
        var userNames = await _db.Users
            .Where(u => userIds.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, u => u.Name);

        return requests
            .Select(r => ToDto(r, userNames.TryGetValue(r.UserId, out var name) ? name : r.UserId))
            .ToList();
    }

    public async Task<WithdrawalRequestDto> ApproveWithdrawalAsync(int requestId, string adminUserId, string? remarks = null)
    {
        var request = await _db.WithdrawalRequests.FirstOrDefaultAsync(r => r.Id == requestId);
        if (request == null)
            throw new KeyNotFoundException("Withdrawal request not found.");
        if (request.Status != WithdrawalStatus.Pending)
            throw new InvalidOperationException("This request has already been processed.");

        // Funds were already reserved (deducted) at request time, so the wallet
        // balance doesn't change here — we just finalize the request and bump
        // TotalWithdrawn so the user's lifetime stats stay accurate.
        request.Status = WithdrawalStatus.Approved;
        request.ProcessedAt = DateTime.UtcNow;
        request.ProcessedByAdminId = adminUserId;
        request.AdminRemarks = remarks;

        var wallet = await GetOrCreateWalletAsync(request.UserId, request.PlanType);
        wallet.TotalWithdrawn += request.Amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == request.UserId);
        return ToDto(request, user?.Name ?? request.UserId);
    }

    public async Task<WithdrawalRequestDto> RejectWithdrawalAsync(int requestId, string adminUserId, string? remarks = null)
    {
        var request = await _db.WithdrawalRequests.FirstOrDefaultAsync(r => r.Id == requestId);
        if (request == null)
            throw new KeyNotFoundException("Withdrawal request not found.");
        if (request.Status != WithdrawalStatus.Pending)
            throw new InvalidOperationException("This request has already been processed.");

        await using var dbTransaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // Refund the reserved amount back into the wallet.
            var wallet = await GetOrCreateWalletAsync(request.UserId, request.PlanType);
            wallet.Balance += request.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            request.Status = WithdrawalStatus.Rejected;
            request.ProcessedAt = DateTime.UtcNow;
            request.ProcessedByAdminId = adminUserId;
            request.AdminRemarks = remarks;

            var refundTxn = new WalletTransaction
            {
                UserId = request.UserId,
                PlanType = request.PlanType,
                Type = WalletTransactionType.Credit,
                Amount = request.Amount,
                BalanceAfter = wallet.Balance,
                Source = "Withdrawal Rejected",
                Description = "Refund - withdrawal request rejected by admin",
                ReferenceId = request.Id.ToString()
            };
            _db.WalletTransactions.Add(refundTxn);

            await _db.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == request.UserId);
            return ToDto(request, user?.Name ?? request.UserId);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Services;

public class CommissionService : ICommissionService
{
    private readonly AppDbContext _db;
    private readonly IWalletService _walletService;

    // The bucket all commission credits land in. Your frontend's WalletPage
    // already treats the "Dream Plan" bucket as the user-facing "Dream Wallet"
    // (see WALLET_META.DREAM.title in wallet/page.tsx) — so commissions must
    // use that exact same string, not a separate one, or they'll never show up.
    private const string CommissionWalletType = "Dream Plan";

    // Level 0 = the buyer themselves (self purchase bonus).
    // Index 1..12 = upline levels 1 (direct sponsor) through 12.
    private static readonly decimal[] LevelPercents =
    {
        10m, // level 0 -> self
        10m, // level 1 -> direct sponsor (parent)
        7m,  // level 2
        5m,  // level 3
        4m,  // level 4
        4m,  // level 5
        3m,  // level 6
        3m,  // level 7
        2m,  // level 8
        2m,  // level 9
        2m,  // level 10
        1m,  // level 11
        1m   // level 12
    };

    private const int MaxUplineLevel = 12;

    public CommissionService(AppDbContext db, IWalletService walletService)
    {
        _db = db;
        _walletService = walletService;
    }

    public async Task DistributeProductPurchaseCommissionAsync(string buyerUserId, decimal totalBv, string referenceId)
    {
        if (totalBv <= 0)
            return;

        var buyer = await _db.Users.FirstOrDefaultAsync(u => u.UserId == buyerUserId);
        if (buyer == null)
            return;

        // ---- Level 0: self purchase bonus, credited to the buyer's own wallet ----
        await CreditLevelAsync(
            recipientUserId: buyer.UserId,
            level: 0,
            totalBv: totalBv,
            downlineUserId: buyer.UserId,
            referenceId: referenceId);

        // ---- Levels 1..12: walk up the SponsorId chain ----
        var currentSponsorId = buyer.SponsorId;
        var triggeringUserId = buyer.UserId; // for the description, always show who actually bought

        for (int level = 1; level <= MaxUplineLevel; level++)
        {
            if (string.IsNullOrWhiteSpace(currentSponsorId))
                break; // chain ended before reaching level 12 — nothing more to pay

            var sponsor = await _db.Users.FirstOrDefaultAsync(u => u.UserId == currentSponsorId);
            if (sponsor == null)
                break; // dangling SponsorId, stop walking

            await CreditLevelAsync(
                recipientUserId: sponsor.UserId,
                level: level,
                totalBv: totalBv,
                downlineUserId: triggeringUserId,
                referenceId: referenceId);

            currentSponsorId = sponsor.SponsorId; // move one level further up
        }
    }

    private async Task CreditLevelAsync(string recipientUserId, int level, decimal totalBv, string downlineUserId, string referenceId)
    {
        var percent = LevelPercents[level];
        var amount = Math.Round(totalBv * percent / 100m, 2, MidpointRounding.AwayFromZero);

        if (amount <= 0)
            return;

        var source = level == 0
            ? "Self Purchase Bonus"
            : $"Level {level} Referral Bonus";

        var description = level == 0
            ? $"{percent}% of {totalBv} BV from your own purchase"
            : $"{percent}% of {totalBv} BV from {downlineUserId}'s purchase (level {level})";

        await _walletService.CreditAsync(
            userId: recipientUserId,
            planType: CommissionWalletType,
            amount: amount,
            source: source,
            description: description,
            referenceId: referenceId);
    }

    // ---------- Reads: commission history & summary ----------

    private static readonly Regex LevelFromSourceRegex = new(@"^Level (\d+) Referral Bonus$", RegexOptions.Compiled);

    private static int ParseLevelFromSource(string source)
    {
        if (source == "Self Purchase Bonus")
            return 0;

        var match = LevelFromSourceRegex.Match(source);
        return match.Success ? int.Parse(match.Groups[1].Value) : -1; // -1 = unrecognized, shouldn't happen
    }

    public async Task<List<CommissionEarningDto>> GetCommissionHistoryAsync(string userId)
    {
        var transactions = await _db.WalletTransactions
            .Where(t => t.UserId == userId && t.PlanType == CommissionWalletType)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        if (transactions.Count == 0)
            return new List<CommissionEarningDto>();

        // referenceId is either a bare Plan.Id ("5", from PlanController.Checkout) or
        // "order-{PaymentOrders.Id}" (from OrdersController.ApprovePayment) — these are
        // two different tables that can share the same numeric Id, so we must not
        // treat them interchangeably.
        var planIds = transactions
            .Where(t => t.ReferenceId != null && int.TryParse(t.ReferenceId, out _))
            .Select(t => int.Parse(t.ReferenceId!))
            .Distinct()
            .ToList();

        var orderIds = transactions
            .Where(t => t.ReferenceId != null && t.ReferenceId.StartsWith("order-")
                        && int.TryParse(t.ReferenceId.Substring("order-".Length), out _))
            .Select(t => int.Parse(t.ReferenceId!.Substring("order-".Length)))
            .Distinct()
            .ToList();

        var plans = await _db.Plans
            .Where(p => planIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        var orders = await _db.PaymentOrders
            .Where(o => orderIds.Contains(o.Id))
            .ToDictionaryAsync(o => o.Id, o => o);

        // Batch-load buyer names for both kinds of purchase.
        var buyerIds = plans.Values.Select(p => p.UserId)
            .Concat(orders.Values.Select(o => o.UserId))
            .Distinct()
            .ToList();
        var buyerNames = await _db.Users
            .Where(u => buyerIds.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, u => u.Name);

        var result = new List<CommissionEarningDto>();

        foreach (var t in transactions)
        {
            var level = ParseLevelFromSource(t.Source);
            if (level < 0)
                continue; // skip anything that isn't one of our own commission entries

            decimal purchaseBv = 0;
            string purchaseType = string.Empty;
            string buyerUserId = string.Empty;

            if (t.ReferenceId != null && t.ReferenceId.StartsWith("order-")
                && int.TryParse(t.ReferenceId.Substring("order-".Length), out var orderId)
                && orders.TryGetValue(orderId, out var order))
            {
                purchaseBv = order.TotalBv;
                purchaseType = "Product Order";
                buyerUserId = order.UserId;
            }
            else if (int.TryParse(t.ReferenceId, out var planId) && plans.TryGetValue(planId, out var plan))
            {
                purchaseBv = plan.TotalBv;
                purchaseType = plan.PlanType;
                buyerUserId = plan.UserId;
            }

            result.Add(new CommissionEarningDto
            {
                TransactionId = t.Id,
                Level = level,
                Percentage = LevelPercents[Math.Min(level, LevelPercents.Length - 1)],
                Amount = t.Amount,
                PurchaseBv = purchaseBv,
                PurchasePlanType = purchaseType,
                BuyerUserId = buyerUserId,
                BuyerName = !string.IsNullOrEmpty(buyerUserId) && buyerNames.TryGetValue(buyerUserId, out var name)
                    ? name
                    : buyerUserId,
                Source = t.Source,
                Description = t.Description,
                PlanId = t.ReferenceId,
                CreatedAt = t.CreatedAt
            });
        }

        return result;
    }

    public async Task<CommissionSummaryDto> GetCommissionSummaryAsync(string userId)
    {
        var history = await GetCommissionHistoryAsync(userId);

        var summary = new CommissionSummaryDto
        {
            TotalCommissionEarned = history.Sum(h => h.Amount),
            SelfBonusEarned = history.Where(h => h.Level == 0).Sum(h => h.Amount),
            UplineBonusEarned = history.Where(h => h.Level > 0).Sum(h => h.Amount),
            TotalEarningEvents = history.Count
        };

        summary.ByLevel = history
            .Where(h => h.Level > 0)
            .GroupBy(h => h.Level)
            .OrderBy(g => g.Key)
            .Select(g => new CommissionLevelBreakdownDto
            {
                Level = g.Key,
                Percentage = LevelPercents[g.Key],
                TotalEarned = g.Sum(x => x.Amount),
                EventCount = g.Count()
            })
            .ToList();

        return summary;
    }
}
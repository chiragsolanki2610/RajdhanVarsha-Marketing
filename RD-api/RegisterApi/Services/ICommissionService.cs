using System.Collections.Generic;
using System.Threading.Tasks;
using RegisterApi.DTOs;

namespace RegisterApi.Services;

public interface ICommissionService
{
    /// <summary>
    /// Distributes BV-based commission for a single product purchase:
    ///  - Credits the buyer's own wallet (self bonus).
    ///  - Walks up the buyer's SponsorId chain up to 12 levels, crediting
    ///    each upline's "Dream Wallet" with their level's percentage of the BV.
    /// Safe to call even if the sponsor chain is shorter than 12 levels —
    /// it simply stops early once it hits a user with no SponsorId.
    /// </summary>
    /// <param name="buyerUserId">UserId (e.g. "RD0013") of the person who made the purchase.</param>
    /// <param name="totalBv">Total BV of the purchase (sum of product BV * quantity).</param>
    /// <param name="referenceId">Usually the Plan.Id (as string) this commission run is tied to — lets every WalletTransaction be traced back to the purchase.</param>
    Task DistributeProductPurchaseCommissionAsync(string buyerUserId, decimal totalBv, string referenceId);

    /// <summary>
    /// Returns every commission-earning event credited to this user (self bonus +
    /// all upline levels), each one joined back to the purchase that triggered it
    /// so you can show "who bought what, and how much you made from it".
    /// </summary>
    Task<List<CommissionEarningDto>> GetCommissionHistoryAsync(string userId);

    /// <summary>
    /// Aggregated commission totals for this user — overall, self vs upline,
    /// and broken down per level (1-12).
    /// </summary>
    Task<CommissionSummaryDto> GetCommissionSummaryAsync(string userId);
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;
using RegisterApi.Services;

namespace RegisterApi.Controllers;

/// <summary>
/// One-time admin tool to clean up Binary Plan pair commissions that were
/// overpaid under the old commission rule (before the equal-sides "n-1" fix).
/// Safe to call more than once — it only reverses real excess, and is a
/// no-op for nodes that are already correctly paid.
/// </summary>
[ApiController]
[Route("api/admin/binary")]
[Authorize(Roles = "Admin")]
public class AdminBinaryCorrectionController : ControllerBase
{
    private readonly IBinaryPlanService _binaryPlanService;
    private readonly AppDbContext _db;

    public AdminBinaryCorrectionController(IBinaryPlanService binaryPlanService, AppDbContext db)
    {
        _binaryPlanService = binaryPlanService;
        _db = db;
    }

    // POST /api/admin/binary/correct-pairs
    // Run this once after deploying the new pairing rule, to fix any users
    // (like RD0001 at 2-2) who were overpaid under the old logic.
    [HttpPost("correct-pairs")]
    public async Task<IActionResult> CorrectOverpaidPairs()
    {
        var log = await _binaryPlanService.CorrectOverpaidPairsAsync();
        return Ok(new
        {
            message = "Correction run complete.",
            affectedCount = log.Count(l => !l.StartsWith("No overpaid")),
            details = log
        });
    }

    // POST /api/admin/binary/recompute-active-counts
    // ONE-TIME FIX for LeftActiveCount/RightActiveCount drift caused by lost
    // increments (old race condition, before the xmin concurrency fix).
    // Recalculates both counters for every node from the REAL tree (actual
    // IsActive flags), overwriting whatever was stored. Run this FIRST, then
    // call POST /api/admin/binary/correct-pairs right after — that second
    // call is what actually recalculates MatchedPairs/commission/wallets
    // from the now-correct counts this endpoint produces. Safe to re-run.
    [HttpPost("recompute-active-counts")]
    public async Task<IActionResult> RecomputeActiveCounts()
    {
        var log = await _binaryPlanService.RecomputeActiveCountsAsync();
        return Ok(new
        {
            message = "Active count recomputation complete. Now call POST /api/admin/binary/correct-pairs to reconcile pairs/commission against the corrected counts.",
            affectedCount = log.Count(l => !l.StartsWith("No drifted")),
            details = log
        });
    }

    // POST /api/admin/binary/fix-pairs-index
    // ONE-TIME production hotfix: the original unique index on
    // BinaryPairs(UserId, LeftChildId, RightChildId) is wrong — a node's
    // LeftChildId/RightChildId stay the same as more pairs form under it,
    // so every 2nd+ pair legitimately reuses those same values, and the
    // unique index blocks the insert with a 23505 duplicate-key error.
    // Migration 20260817000000_FixBinaryPairsUniqueConstraint already
    // fixes this going forward, but if that migration hasn't taken effect
    // on THIS database yet (e.g. it predates the current deploy), this
    // endpoint applies the exact same fix directly via raw SQL so it can
    // be run once from the browser/Postman without DB console access.
    // Safe to call more than once.
    [HttpPost("fix-pairs-index")]
    public async Task<IActionResult> FixBinaryPairsIndex()
    {
        await _db.Database.ExecuteSqlRawAsync(
            "DROP INDEX IF EXISTS \"IX_BinaryPairs_UserId_LeftChildId_RightChildId\";");

        await _db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS \"IX_BinaryPairs_UserId_LeftChildId_RightChildId\" " +
            "ON \"BinaryPairs\" (\"UserId\", \"LeftChildId\", \"RightChildId\");");

        await _db.Database.ExecuteSqlRawAsync(
            "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") " +
            "VALUES ('20260817000000_FixBinaryPairsUniqueConstraint', '8.0.0') " +
            "ON CONFLICT (\"MigrationId\") DO NOTHING;");

        return Ok(new
        {
            message = "BinaryPairs index fixed. It is now non-unique, so pair activations will no longer fail with a duplicate-key error."
        });
    }
}

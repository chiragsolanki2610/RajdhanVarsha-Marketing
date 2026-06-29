using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    public AdminBinaryCorrectionController(IBinaryPlanService binaryPlanService)
    {
        _binaryPlanService = binaryPlanService;
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
}
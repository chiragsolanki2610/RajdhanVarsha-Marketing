using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RegisterApi.DTOs;
using RegisterApi.Models;
using RegisterApi.Services;

namespace RegisterApi.Controllers;

[ApiController]
[Route("api/admin/withdrawals")]
[Authorize(Roles = "Admin")]
public class AdminWalletController : ControllerBase
{
    private readonly IWalletService _walletService;

    public AdminWalletController(IWalletService walletService)
    {
        _walletService = walletService;
    }

    private string CurrentAdminId =>
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("userId claim missing from token.");

    // GET /api/admin/withdrawals?status=Pending  (omit status to see all)
    [HttpGet]
    public async Task<IActionResult> GetWithdrawals([FromQuery] WithdrawalStatus? status = null)
    {
        var requests = await _walletService.GetWithdrawalRequestsAsync(status);
        return Ok(requests);
    }

    // POST /api/admin/withdrawals/5/approve
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id, [FromBody] ProcessWithdrawalDto dto)
    {
        try
        {
            var result = await _walletService.ApproveWithdrawalAsync(id, CurrentAdminId, dto.AdminRemarks);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST /api/admin/withdrawals/5/reject
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] ProcessWithdrawalDto dto)
    {
        try
        {
            var result = await _walletService.RejectWithdrawalAsync(id, CurrentAdminId, dto.AdminRemarks);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
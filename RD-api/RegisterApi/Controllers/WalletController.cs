using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RegisterApi.DTOs;
using RegisterApi.Services;
using System.Threading.Tasks;

namespace RegisterApi.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;

    public WalletController(IWalletService walletService)
    {
        _walletService = walletService;
    }

    private string CurrentUserId =>
        User.FindFirst("userId")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("userId claim missing from token.");

    // GET /api/wallet  -> both sub-wallets (Dream Plan + Binary Plan) with balances
    [HttpGet]
    public async Task<IActionResult> GetMyWallets()
    {
        var wallets = await _walletService.GetWalletsAsync(CurrentUserId);
        return Ok(wallets);
    }

    // GET /api/wallet/transactions?planType=Dream Plan  -> transaction history (omit planType for both)
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactionHistory([FromQuery] string? planType = null)
    {
        var history = await _walletService.GetTransactionHistoryAsync(CurrentUserId, planType);
        return Ok(history);
    }

    // POST /api/wallet/withdraw  { "planType": "Dream Plan", "amount": 500 }
    [HttpPost("withdraw")]
    public async Task<IActionResult> RequestWithdrawal([FromBody] RequestWithdrawalDto dto)
    {
        try
        {
            var result = await _walletService.RequestWithdrawalAsync(CurrentUserId, dto.PlanType, dto.Amount);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
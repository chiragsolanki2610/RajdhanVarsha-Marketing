using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RegisterApi.DTOs;
using RegisterApi.Services;
using RegisterApi.Models;
using System.Security.Claims;

namespace RegisterApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;

    public AuthController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Register a new user. Returns a generated User ID (e.g. RD0001) and password.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RegisterResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, data) = await _userService.RegisterAsync(dto);

        if (!success)
            return Conflict(new { message = error });

        return CreatedAtAction(nameof(GetUserById), new { userId = data!.UserId }, data);
    }

    /// <summary>
    /// Login using generated User ID and password. Returns a JWT token.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (success, error, data) = await _userService.LoginAsync(dto);

        if (!success)
            return Unauthorized(new { message = error });

        return Ok(data);
    }

    /// <summary>
    /// Gets the full profile of the currently authenticated user via JWT token claims.
    /// </summary>
    [HttpGet("profile")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile()
    {
        // 🛠️ robust token claim fallback parsing to prevent context drops
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("UserId")?.Value;

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { message = "Invalid or expired session token." });

        var user = await _userService.GetUserByIdAsync(userId);

        if (user is null)
            return NotFound(new { message = "User record not found in database." });

        return Ok(new
        {
            name = user.Name,
            memberId = user.UserId,
            mobileNo = user.MobileNo,
            aadharNo = user.AadharNo,
            sponsorId = user.SponsorId,
            sponsorIdName = user.SponsorIdName,
            position = user.Position,
            address = user.Address,
            joinDate = user.CreatedAt.ToString("dd-MMM-yyyy"),
            role = user.Role.ToString(),
            status = "ACTIVE",
            membershipLevel = user.Role == UserRole.Admin ? "System Administrator" : "Registered Member",
            bvPoints = user.BusinessVolume,
            referrals = 0,
            currentRank = "New Member",
            nextRank = "Silver Member",
            neededReferrals = 10,

            isKycCompleted = user.IsKycCompleted,
            bankName = user.BankName ?? "",
            accountNo = user.AccountNo ?? "",
            ifscCode = user.IfscCode ?? "",
            accountType = user.AccountType ?? "Savings"
        });
    }

    /// <summary>
    /// 🛠️ DUAL-PURPOSE COMPATIBILITY ACTION
    /// Handles Sidebar profile queries and Registration-form Sponsor matching dynamically.
    /// </summary>
    [HttpGet("{userId}")]
    [AllowAnonymous] // Handled internally to allow both secure profile fetching and public sponsor lookup
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserById(string userId)
    {
        var user = await _userService.GetUserByIdAsync(userId);

        if (user is null)
            return NotFound(new { message = $"User with ID '{userId}' not found." });

        // CASE 1: If the client is logged in, allow them to view profile data directly
        if (User.Identity?.IsAuthenticated == true)
        {
            return Ok(new
            {
                name = user.Name,
                memberId = user.UserId,
                mobileNo = user.MobileNo,
                aadharNo = user.AadharNo,
                sponsorId = user.SponsorId,
                sponsorIdName = user.SponsorIdName,
                position = user.Position,
                address = user.Address,
                joinDate = user.CreatedAt.ToString("dd-MMM-yyyy"),
                role = user.Role.ToString(),
                status = "ACTIVE",
                membershipLevel = user.Role == UserRole.Admin ? "System Administrator" : "Registered Member",
                bvPoints = user.BusinessVolume,

                isKycCompleted = user.IsKycCompleted,
                bankName = user.BankName ?? "",
                accountNo = user.AccountNo ?? "",
                ifscCode = user.IfscCode ?? "",
                accountType = user.AccountType ?? "Savings"
            });
        }

        // CASE 2: Fallback for public registration page sponsor mapping lookup validation
        return Ok(new
        {
            sponsorId = user.UserId,
            name = user.Name,
            sponsorIdName = user.Name // Maps directly to both formats expected by Next.js clients
        });
    }

    /// <summary>
    /// Live sponsor lookup for the public registration form. 
    /// Does not require [Authorize] so the register page can verify codes on the fly.
    /// </summary>
    [HttpGet("sponsor-lookup/{sponsorId}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LookupSponsor(string sponsorId)
    {
        var user = await _userService.GetUserByIdAsync(sponsorId);

        if (user is null)
            return NotFound(new { message = "Sponsor ID not found." });

        return Ok(new
        {
            sponsorId = user.UserId,
            name = user.Name,
            sponsorIdName = user.Name
        });
    }
}
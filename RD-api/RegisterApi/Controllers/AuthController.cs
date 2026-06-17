using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RegisterApi.DTOs;
using RegisterApi.Services;
using RegisterApi.Models; // Added to access UserRole enum
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
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

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

            // Pass the string value ("User" or "Admin") to the frontend layout engine
            role = user.Role.ToString(),

            status = "ACTIVE",
            // Dynamically change the membership title text depending on their actual role
            membershipLevel = user.Role == UserRole.Admin ? "System Administrator" : "Registered Member",
            bvPoints = 0,
            referrals = 0,
            currentRank = "New Member",
            nextRank = "Silver Member",
            neededReferrals = 10,
            isKycCompleted = false,

            // KYC bank fields — not in User model yet, return empty for now
            bankName = "",
            accountNo = "",
            ifscCode = "",
            accountType = "Savings"
        });
    }

    /// <summary>
    /// Fetch user details by their generated custom User ID. Only accessible by Admins.
    /// </summary>
    [HttpGet("{userId}")]
    [Authorize(Roles = "Admin")] // Blocks normal users; returns 403 Forbidden unless logged in as Admin
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserById(string userId)
    {
        var user = await _userService.GetUserByIdAsync(userId);

        if (user is null)
            return NotFound(new { message = $"User with ID '{userId}' not found." });

        return Ok(new
        {
            user.UserId,
            user.Name,
            user.MobileNo,
            user.AadharNo,
            user.SponsorId,
            user.SponsorIdName,
            user.Position,
            user.Address,
            user.CreatedAt,
            role = user.Role.ToString()
        });
    }
}
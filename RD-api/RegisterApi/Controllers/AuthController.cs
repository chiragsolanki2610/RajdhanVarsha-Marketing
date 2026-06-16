using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RegisterApi.DTOs;
using RegisterApi.Services;
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
    /// Gets the profile details of the currently authenticated logged-in user via JWT token claims.
    /// </summary>
    [HttpGet("profile")]
    [Authorize] // Requires a valid JWT bearer token in the headers
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile()
    {
        // Extracts the unique User ID embedded in the JWT token payload
        // Note: Replace ClaimTypes.NameIdentifier if your login token uses a custom key (e.g., "id" or "sub")
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Invalid or expired session token." });
        }

        var user = await _userService.GetUserByIdAsync(userId);

        if (user is null)
            return NotFound(new { message = "User record not found in database." });

        // Maps structural DB properties to clean keys matching frontend expectations
        return Ok(new
        {
            name = user.Name,
            memberId = user.UserId
        });
    }

    /// <summary>
    /// Fetch user details by their generated custom User ID.
    /// </summary>
    [HttpGet("{userId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserById(string userId)
    {
        var user = await _userService.GetUserByIdAsync(userId);

        if (user is null)
            return NotFound(new { message = $"User with ID '{userId}' not found." });

        var userProfile = new
        {
            user.UserId,
            user.Name,
            user.MobileNo,
            user.AadharNo,
            user.SponsorId,
            user.SponsorIdName,
            user.Position,
            user.Address,
            user.CreatedAt
        };

        return Ok(userProfile);
    }
}
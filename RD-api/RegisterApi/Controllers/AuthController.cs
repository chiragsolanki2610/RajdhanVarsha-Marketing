using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RegisterApi.DTOs;
using RegisterApi.Services;

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

        // This links directly to the GetUserById route and passes the custom generated string UserId
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

        // Maps data fields dynamically to protect plain text password/hash variables from leaking
        var userProfile = new
        {
            user.UserId,
            user.Name,
            user.MobileNo,
            user.AadharNo,
            user.SponsorId,
            user.SponsorIdName,
            user.Position,
            user.Address, // REMOVED: user.UnderUserId is no longer tracked here
            user.CreatedAt
        };

        return Ok(userProfile);
    }
}
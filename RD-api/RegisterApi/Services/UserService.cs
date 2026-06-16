using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using RegisterApi.Data;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly IUserIdGenerator _idGenerator;
    private readonly IPasswordService _passwordService;
    private readonly IConfiguration _config;

    public UserService(
        AppDbContext db,
        IUserIdGenerator idGenerator,
        IPasswordService passwordService,
        IConfiguration config)
    {
        _db = db;
        _idGenerator = idGenerator;
        _passwordService = passwordService;
        _config = config;
    }

    public async Task<(bool Success, string Error, RegisterResponseDto? Data)> RegisterAsync(RegisterRequestDto dto)
    {
        // 1. Check duplicate mobile
        if (await _db.Users.AnyAsync(u => u.MobileNo == dto.MobileNo.Trim()))
            return (false, "Mobile number is already registered.", null);

        // 2. Check duplicate Aadhar
        if (await _db.Users.AnyAsync(u => u.AadharNo == dto.AadharNo.Trim()))
            return (false, "Aadhar number is already registered.", null);

        // 3. Generate unique user ID beforehand to see if it is the first ID
        var userId = await _idGenerator.GenerateNextUserIdAsync();

        bool isSuperAdmin = (userId == "RD0001");

        string finalSponsorId = "";
        string finalSponsorName = "";

        // 4. Validate Sponsor rules
        if (isSuperAdmin)
        {
            // First user registration bypasses SponsorId requirements completely
            finalSponsorId = "SYSTEM";
            finalSponsorName = "Super Admin";
        }
        else
        {
            // Regular users MUST provide a valid Sponsor ID
            if (string.IsNullOrWhiteSpace(dto.SponsorId))
            {
                return (false, "Sponsor ID is required for registration.", null);
            }

            var sponsor = await _db.Users.FirstOrDefaultAsync(u => u.UserId == dto.SponsorId.Trim());
            if (sponsor is null)
            {
                return (false, "Sponsor ID does not exist. Please enter a valid Sponsor ID.", null);
            }

            finalSponsorId = sponsor.UserId;
            finalSponsorName = sponsor.Name;
        }

        // 5. Generate security credentials
        var plainPassword = _passwordService.GeneratePassword();
        var hashedPassword = _passwordService.HashPassword(plainPassword);

        var user = new User
        {
            UserId = userId,
            Name = dto.Name.Trim(),
            MobileNo = dto.MobileNo.Trim(),
            AadharNo = dto.AadharNo.Trim(),
            SponsorId = finalSponsorId,
            SponsorIdName = finalSponsorName,
            Position = dto.Position.Trim(),
            Address = dto.Address.Trim(),
            Password = plainPassword,
            PasswordHash = hashedPassword,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return (true, string.Empty, new RegisterResponseDto
        {
            UserId = userId,
            GeneratedPassword = plainPassword,
            Name = user.Name,
            MobileNo = user.MobileNo,
            SponsorId = finalSponsorId,
            SponsorIdName = finalSponsorName,
            Message = isSuperAdmin
                ? "Super Admin Registration successful! Save your User ID and Password!"
                : "Registration successful. Save your User ID and Password!"
        });
    }

    public async Task<(bool Success, string Error, LoginResponseDto? Data)> LoginAsync(LoginRequestDto dto)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.UserId == dto.UserId.Trim());

        if (user is null || !_passwordService.VerifyPassword(dto.Password, user.PasswordHash))
            return (false, "Invalid User ID or password.", null);

        var token = GenerateJwtToken(user);

        return (true, string.Empty, new LoginResponseDto
        {
            UserId = user.UserId,
            Name = user.Name,
            MobileNo = user.MobileNo,
            Position = user.Position,
            SponsorId = user.SponsorId,
            SponsorIdName = user.SponsorIdName,
            Token = token
        });
    }

    public async Task<User?> GetUserByIdAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return null;

        return await _db.Users
            .FirstOrDefaultAsync(u => u.UserId == userId.Trim());
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _config["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT key not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId),
            new Claim(ClaimTypes.Name,           user.Name),
            new Claim(ClaimTypes.MobilePhone,    user.MobileNo),
            new Claim(ClaimTypes.Role,           user.Position)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
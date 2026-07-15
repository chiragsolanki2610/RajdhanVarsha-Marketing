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

        // 2. Check duplicate identification document details
        if (await _db.Users.AnyAsync(u => u.AadharNo == dto.AadharNo.Trim()))
            return (false, "Identification number is already registered.", null);

        // 3. Generate unique user ID beforehand to see if it is the first ID
        var userId = await _idGenerator.GenerateNextUserIdAsync();

        bool isSuperAdmin = (userId == "RD0001");

        string finalSponsorId = "";
        string finalSponsorName = "";

        // Tracking fields for the binary tree structure
        string? calculatedParentId = null;
        int calculatedTreeLevel = 0;
        string calculatedLeftLineage = string.Empty;
        string calculatedRightLineage = string.Empty;

        // 4. Validate Sponsor & Determine Tree Placement rules
        if (isSuperAdmin)
        {
            // First user registration bypasses SponsorId requirements completely
            finalSponsorId = "SYSTEM";
            finalSponsorName = "Super Admin";

            // Root user has no parent or lineages
            calculatedParentId = null;
            calculatedTreeLevel = 0;
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

            // 🌳 BINARY TREE PLACEMENT ALGORITHM 🌳
            // Find the extreme down-line leaf node along the chosen side (Left/Right)
            var targetParent = await FindExtremeLeafNodeAsync(sponsor.UserId, dto.Position.Trim());

            calculatedParentId = targetParent.UserId;
            calculatedTreeLevel = targetParent.TreeLevel + 1;

            // Build structural lineages to allow easy downline counting/visuals later
            if (dto.Position.Trim() == "Left")
            {
                calculatedLeftLineage = string.IsNullOrEmpty(targetParent.LeftLineage)
                    ? targetParent.UserId
                    : $"{targetParent.LeftLineage},{targetParent.UserId}";
                calculatedRightLineage = targetParent.RightLineage;
            }
            else // Right
            {
                calculatedLeftLineage = targetParent.LeftLineage;
                calculatedRightLineage = string.IsNullOrEmpty(targetParent.RightLineage)
                    ? targetParent.UserId
                    : $"{targetParent.RightLineage},{targetParent.UserId}";
            }
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

            // Automatically make RD0001 the Admin, everyone else a standard User
            Role = isSuperAdmin ? UserRole.Admin : UserRole.User,

            // Tree node linkage fields
            ParentId = calculatedParentId,
            TreeLevel = calculatedTreeLevel,
            LeftLineage = calculatedLeftLineage,
            RightLineage = calculatedRightLineage,

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

        // Check if user exists and verify password using the safe fallback method
        if (user is null || !VerifyPasswordWithLegacyFallback(dto.Password, user.PasswordHash))
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

    public async Task<(bool Success, string Error)> ChangePasswordAsync(string userId, ChangePasswordRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return (false, "Invalid or expired session token.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId.Trim());
        if (user is null)
            return (false, "User record not found in database.");

        // 1. Verify the current password using the safe fallback method
        if (!VerifyPasswordWithLegacyFallback(dto.OldPassword, user.PasswordHash))
            return (false, "Current password is incorrect.");

        // 2. Don't allow "changing" to the same password
        if (VerifyPasswordWithLegacyFallback(dto.NewPassword, user.PasswordHash))
            return (false, "New password must be different from the current password.");

        // 3. Hash and persist the new password securely
        user.PasswordHash = _passwordService.HashPassword(dto.NewPassword);
        user.Password = dto.NewPassword; // kept in sync with the plaintext field used elsewhere (e.g. registration)

        await _db.SaveChangesAsync();

        return (true, string.Empty);
    }

    /// <summary>
    /// Updates (or clears, if null) the current user's profile picture.
    /// The picture is a Base64 data URI stored directly on the User row --
    /// same pattern as PaymentOrder.ScreenshotUrl, no file bucket needed.
    /// </summary>
    public async Task<(bool Success, string Error)> UpdateProfilePictureAsync(string userId, string? profilePictureUrl)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return (false, "Invalid or expired session token.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId.Trim());
        if (user is null)
            return (false, "User record not found in database.");

        user.ProfilePictureUrl = profilePictureUrl;
        await _db.SaveChangesAsync();

        return (true, string.Empty);
    }

    /// <summary>
    /// One-time sponsor attachment for legacy-imported accounts whose
    /// SponsorId is null/empty. Used by the Dream Plan "enroll" gate:
    /// POST /api/Auth/set-sponsor. Once a user has a non-empty SponsorId
    /// (including the root user's "SYSTEM" value) this always rejects —
    /// there is no separate "locked" flag, the SponsorId column itself is
    /// the lock, same as it already is for freshly-registered users.
    /// </summary>
    public async Task<(bool Success, string Error, string SponsorId, string SponsorIdName)> SetSponsorAsync(string userId, string sponsorId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return (false, "Invalid or expired session token.", "", "");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId.Trim());
        if (user is null)
            return (false, "User record not found in database.", "", "");

        // Already has a sponsor (fresh registration, an earlier call to this
        // endpoint, or the root user's "SYSTEM" value) — reject, this is a
        // one-time operation.
        if (!string.IsNullOrWhiteSpace(user.SponsorId))
            return (false, "Sponsor is already set for this account.", "", "");

        var trimmedSponsorId = (sponsorId ?? "").Trim();
        if (string.IsNullOrWhiteSpace(trimmedSponsorId))
            return (false, "Sponsor ID is required.", "", "");

        if (string.Equals(trimmedSponsorId, user.UserId, StringComparison.OrdinalIgnoreCase))
            return (false, "You cannot set yourself as your own sponsor.", "", "");

        var sponsor = await _db.Users.FirstOrDefaultAsync(u => u.UserId == trimmedSponsorId);
        if (sponsor is null)
            return (false, "Sponsor ID does not exist. Please enter a valid Sponsor ID.", "", "");

        user.SponsorId = sponsor.UserId;
        user.SponsorIdName = sponsor.Name;
        await _db.SaveChangesAsync();

        return (true, string.Empty, sponsor.UserId, sponsor.Name);
    }

    /// <summary>
    /// Traverses down the leg structure along the selected side (Left or Right) 
    /// until it discovers an open position to correctly link the node.
    /// </summary>
    private async Task<User> FindExtremeLeafNodeAsync(string sponsorUserId, string position)
    {
        User current = await _db.Users.FirstAsync(u => u.UserId == sponsorUserId);
        bool emptySlotFound = false;

        while (!emptySlotFound)
        {
            // Look for any node directly attached to the current user on this specific leg position
            var directChild = await _db.Users
                .FirstOrDefaultAsync(u => u.ParentId == current.UserId && u.Position == position);

            if (directChild == null)
            {
                // Found an empty position! This node will be the immediate parent.
                emptySlotFound = true;
            }
            else
            {
                // Slot is occupied, move down one level to look deeper along the leg chain
                current = directChild;
            }
        }

        return current;
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
            
            // Bind the actual user.Role to the token claim so the API guards understand it
            new Claim(ClaimTypes.Role,           user.Role.ToString())
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

    /// <summary>
    /// Helper method to safely verify passwords for both new users (BCrypt) 
    /// and legacy users imported from CSV (plain-text).
    /// </summary>
    private bool VerifyPasswordWithLegacyFallback(string plainTextPassword, string hashFromDatabase)
    {
        if (string.IsNullOrEmpty(hashFromDatabase))
            return false;

        // BCrypt hashes always start with "$2" (e.g., $2a$, $2b$)
        if (!hashFromDatabase.StartsWith("$2"))
        {
            // Legacy plain-text compare for imported users
            return plainTextPassword == hashFromDatabase;
        }

        // Standard secure BCrypt compare
        return _passwordService.VerifyPassword(plainTextPassword, hashFromDatabase);
    }
}
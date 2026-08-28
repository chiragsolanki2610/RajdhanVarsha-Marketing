using System.Threading.Tasks;
using RegisterApi.DTOs;
using RegisterApi.Models;

namespace RegisterApi.Services;

public interface IUserService
{
    Task<(bool Success, string Error, RegisterResponseDto? Data)> RegisterAsync(RegisterRequestDto dto);
    Task<(bool Success, string Error, LoginResponseDto? Data)> LoginAsync(LoginRequestDto dto);
    Task<User?> GetUserByIdAsync(string userId);
    Task<(bool Success, string Error)> ChangePasswordAsync(string userId, ChangePasswordRequestDto dto);
    Task<(bool Success, string Error)> UpdateProfilePictureAsync(string userId, string? profilePictureUrl);

    // One-time: attaches a sponsor to a user whose SponsorId is currently
    // null/empty (legacy imported accounts). Returns the resolved sponsor's
    // UserId + Name on success.
    Task<(bool Success, string Error, string SponsorId, string SponsorIdName)> SetSponsorAsync(string userId, string sponsorId);
}
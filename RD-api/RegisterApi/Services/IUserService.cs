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
}
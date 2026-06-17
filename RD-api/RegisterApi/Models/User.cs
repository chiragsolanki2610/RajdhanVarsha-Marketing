namespace RegisterApi.Models;

// 1. Define the roles available in your system
public enum UserRole
{
    User = 0,
    Admin = 1
}

public class User
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string MobileNo { get; set; } = string.Empty;
    public string AadharNo { get; set; } = string.Empty;
    public string SponsorId { get; set; } = string.Empty;
    public string SponsorIdName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    // 2. Add the Role property, defaulting to UserRole.User
    public UserRole Role { get; set; } = UserRole.User;

    // KYC-related fields, populated once an admin approves a KycRequest
    public bool IsKycCompleted { get; set; } = false;
    public string? BankName { get; set; }
    public string? AccountNo { get; set; }
    public string? IfscCode { get; set; }
    public string? AccountType { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
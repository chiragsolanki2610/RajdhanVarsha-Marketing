using System.ComponentModel.DataAnnotations;

namespace RegisterApi.DTOs;

public class RegisterRequestDto
{
    [Required(ErrorMessage = "Name is required")]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mobile number is required")]
    [RegularExpression(@"^\d{10}$", ErrorMessage = "Mobile number must be 10 digits")]
    public string MobileNo { get; set; } = string.Empty;

    [Required(ErrorMessage = "Aadhar number is required")]
    [RegularExpression(@"^\d{12}$", ErrorMessage = "Aadhar number must be 12 digits")]
    public string AadharNo { get; set; } = string.Empty;

    // REMOVED [Required] validation attribute to allow Super Admin bypass
    public string? SponsorId { get; set; } = string.Empty;

    // Auto-filled from database — user does not need to enter this
    public string SponsorIdName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Position is required")]
    [RegularExpression(@"^(Left|Right)$", ErrorMessage = "Position must be 'Left' or 'Right'")]
    public string Position { get; set; } = string.Empty;

    [Required(ErrorMessage = "Address is required")]
    public string Address { get; set; } = string.Empty;
}

public class RegisterResponseDto
{
    public string UserId { get; set; } = string.Empty;
    public string GeneratedPassword { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string MobileNo { get; set; } = string.Empty;
    public string SponsorId { get; set; } = string.Empty;
    public string SponsorIdName { get; set; } = string.Empty;
    public string Message { get; set; } = "Registration successful";
}

public class LoginRequestDto
{
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string MobileNo { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string SponsorId { get; set; } = string.Empty;
    public string SponsorIdName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string Message { get; set; } = "Login successful";
}
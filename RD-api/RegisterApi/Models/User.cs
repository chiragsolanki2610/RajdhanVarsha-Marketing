namespace RegisterApi.Models;

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
    public string UnderUserId { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
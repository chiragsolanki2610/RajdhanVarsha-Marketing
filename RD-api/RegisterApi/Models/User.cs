using System;

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
    public string? SponsorId { get; set; } = string.Empty;
    public string SponsorIdName { get; set; } = string.Empty;

    public string? Position { get; set; } = null;

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


    // --- Plan & Acceleration Progress Fields ---

    // Tracks if user has completed plan acquisition payment steps
    public bool IsActive { get; set; } = false;

    // Stores the selected plan title chosen from the dashboard panel (e.g., "Dream Plan", "Binary Plan")
    public string? SelectedPlan { get; set; } = null;

    // Tracks total accumulated Business Volume calculations for payout metrics
    public int BusinessVolume { get; set; } = 0;

    // Tracks activation status shown in dashboard — set to "active" when a valid plan is purchased
    public string IdStatus { get; set; } = "inactive";


    // --- Binary Tree Tracking Fields ---

    // The immediate node above this user in the tree structure
    public string? ParentId { get; set; }

    // Tracks the structural depth level in the network tree
    public int TreeLevel { get; set; } = 0;

    // Helps quickly locate everyone down the Left or Right lineage
    public string LeftLineage { get; set; } = string.Empty;
    public string RightLineage { get; set; } = string.Empty;
}
using System;

namespace RegisterApi.Models;

/// <summary>
/// Represents a single user's node in the Binary Plan tree.
/// One row per user who has joined the Binary Plan.
/// Completely separate from Dream Plan / SponsorId chain.
/// </summary>
public class BinaryNode
{
    public int Id { get; set; }

    /// <summary>FK → User.UserId (e.g. "RD0001")</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Who sponsored this user to join the Binary Plan</summary>
    public string? SponsorId { get; set; }

    /// <summary>Direct structural parent in the binary tree</summary>
    public string? ParentId { get; set; }

    /// <summary>
    /// Position of this node relative to its parent.
    /// "ROOT"  — the single root node (ParentId is null).
    /// "LEFT"  — occupies the left slot of its parent.
    /// "RIGHT" — occupies the right slot of its parent.
    /// </summary>
    public string Position { get; set; } = string.Empty;

    /// <summary>UserId of the left child (null if empty)</summary>
    public string? LeftChildId { get; set; }

    /// <summary>UserId of the right child (null if empty)</summary>
    public string? RightChildId { get; set; }

    public int TreeLevel { get; set; } = 0;

    /// <summary>Total members in the entire left subtree</summary>
    public int LeftLegCount { get; set; } = 0;

    /// <summary>Total members in the entire right subtree</summary>
    public int RightLegCount { get; set; } = 0;

    /// <summary>Total ACTIVE members in the entire left subtree (used for pair matching)</summary>
    public int LeftActiveCount { get; set; } = 0;

    /// <summary>Total ACTIVE members in the entire right subtree (used for pair matching)</summary>
    public int RightActiveCount { get; set; } = 0;

    /// <summary>
    /// How many pairs have already been matched & paid for this node, out of
    /// min(LeftActiveCount, RightActiveCount). Prevents re-paying the same pair
    /// and lets new pairs be detected as min(left,right) grows.
    /// </summary>
    public int MatchedPairs { get; set; } = 0;

    public decimal LeftLegBv { get; set; } = 0;
    public decimal RightLegBv { get; set; } = 0;
    public decimal TotalBv { get; set; } = 0;

    /// <summary>True once user has purchased ≥600 BV of products</summary>
    public bool IsActive { get; set; } = false;

    public DateTime? ActivatedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
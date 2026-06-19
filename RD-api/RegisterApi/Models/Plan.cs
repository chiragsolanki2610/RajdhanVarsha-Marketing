using System;
using System.Collections.Generic;

namespace RegisterApi.Models;

public enum PlanStatus { Pending = 0, Paid = 1, Failed = 2 }

public class Plan
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;   // FK -> User.UserId (e.g. RD0001)
    public string PlanType { get; set; } = string.Empty; // "Dream Plan", "Binary Plan"
    public decimal TotalBv { get; set; }
    public decimal TotalAmount { get; set; }
    public PlanStatus Status { get; set; } = PlanStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PlanItem> Items { get; set; } = new List<PlanItem>();
}
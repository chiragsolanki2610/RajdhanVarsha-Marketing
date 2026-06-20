using Microsoft.EntityFrameworkCore;
using RegisterApi.Models;

namespace RegisterApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<KycRequest> KycRequests => Set<KycRequest>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<PlanItem> PlanItems => Set<PlanItem>();

    // --- Wallet system ---
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<WithdrawalRequest> WithdrawalRequests => Set<WithdrawalRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => e.MobileNo).IsUnique();
            entity.HasIndex(e => e.AadharNo).IsUnique();
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.MobileNo).HasMaxLength(15).IsRequired();
            entity.Property(e => e.AadharNo).HasMaxLength(12).IsRequired();
            entity.Property(e => e.Role)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();
        });

        modelBuilder.Entity<KycRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasDefaultValue("Pending");
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Products");

            // ✅ Explicit column names to match Supabase PascalCase columns
            entity.Property(e => e.Id)
                  .HasColumnName("Id");

            entity.Property(e => e.ProductNo)
                  .HasColumnName("ProductNo")
                  .HasMaxLength(50)
                  .IsRequired();

            entity.Property(e => e.ProductName)
                  .HasColumnName("ProductName")
                  .HasMaxLength(200)
                  .IsRequired();

            entity.Property(e => e.Category)
                  .HasColumnName("Category")
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(e => e.Description)
                  .HasColumnName("Description")
                  .IsRequired();

            entity.Property(e => e.Mrp)
                  .HasColumnName("Mrp")
                  .HasColumnType("decimal(18,2)");

            entity.Property(e => e.Gst)
                  .HasColumnName("Gst")
                  .HasColumnType("decimal(5,2)");

            entity.Property(e => e.Dp)
                  .HasColumnName("Dp")
                  .HasColumnType("decimal(18,2)");

            entity.Property(e => e.Bv)
                  .HasColumnName("Bv")
                  .HasColumnType("decimal(18,2)");

            entity.Property(e => e.ImageUrl)
                  .HasColumnName("ImageUrl");

            entity.Property(e => e.IsActive)
                  .HasColumnName("IsActive")
                  .HasDefaultValue(true);

            entity.Property(e => e.AddedBy)
                  .HasColumnName("AddedBy");

            entity.Property(e => e.CreatedAt)
                  .HasColumnName("CreatedAt")
                  .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                  .HasColumnName("UpdatedAt")
                  .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.ProductNo)
                  .IsUnique();
        });

        modelBuilder.Entity<Plan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.PlanType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.TotalBv).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Status)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<PlanItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Bv).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Mrp).HasColumnType("decimal(18,2)");

            entity.HasOne(e => e.Plan)
                  .WithMany(p => p.Items)
                  .HasForeignKey(e => e.PlanId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.PlanId);
            entity.HasIndex(e => e.ProductId);
        });

        // --- Wallet system ---

        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.PlanType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Balance).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalEarned).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalWithdrawn).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // One wallet per user per plan
            entity.HasIndex(e => new { e.UserId, e.PlanType }).IsUnique();
        });

        modelBuilder.Entity<WalletTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.PlanType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Type)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.BalanceAfter).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Source).HasMaxLength(100).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.PlanType });
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<WithdrawalRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.PlanType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Status)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();
            entity.Property(e => e.RequestedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
        });
    }
}
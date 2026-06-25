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

    // --- Payment Orders (product purchases via UPI) ---
    public DbSet<PaymentOrder> PaymentOrders => Set<PaymentOrder>();

    // --- Binary Plan ---
    public DbSet<BinaryNode> BinaryNodes => Set<BinaryNode>();
    public DbSet<BinaryPair> BinaryPairs => Set<BinaryPair>();
    public DbSet<BinaryWallet> BinaryWallets => Set<BinaryWallet>();
    public DbSet<BinaryWalletTransaction> BinaryWalletTransactions => Set<BinaryWalletTransaction>();
    public DbSet<BinaryWithdrawalRequest> BinaryWithdrawalRequests => Set<BinaryWithdrawalRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // --- Core Models (From Old File) ---

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
            entity.Property(e => e.ProductNo).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).IsRequired();
            entity.Property(e => e.Mrp).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Gst).HasColumnType("decimal(5,2)");
            entity.Property(e => e.Dp).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Bv).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ImageUrl);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.AddedBy);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.ProductNo).IsUnique();
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

        // --- Wallet System Models (From Old File) ---

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

        // --- Payment Orders Model (From Old File) ---

        modelBuilder.Entity<PaymentOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.UtrNumber).HasMaxLength(30).IsRequired();
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalBv).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CartItemsJson).IsRequired();
            entity.Property(e => e.Status)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();
            entity.Property(e => e.RequestedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.ReceiptPdf).HasColumnType("bytea");
            entity.Property(e => e.ReceiptTotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ReceiptTotalBv).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
        });

        // --- Binary Plan Models ---

        modelBuilder.Entity<BinaryNode>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.SponsorId).HasMaxLength(10);
            entity.Property(e => e.ParentId).HasMaxLength(10);
            entity.Property(e => e.Position).HasMaxLength(5).IsRequired();
            entity.Property(e => e.LeftChildId).HasMaxLength(10);
            entity.Property(e => e.RightChildId).HasMaxLength(10);
            entity.Property(e => e.LeftLegBv).HasColumnType("decimal(18,2)");
            entity.Property(e => e.RightLegBv).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalBv).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => e.ParentId);
            entity.HasIndex(e => e.SponsorId);
        });

        modelBuilder.Entity<BinaryPair>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.LeftChildId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.RightChildId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.CommissionAmt).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CreditedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<BinaryWallet>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Balance).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalEarned).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalWithdrawn).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        modelBuilder.Entity<BinaryWalletTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Type)
                  .HasConversion<string>()
                  .HasMaxLength(10)
                  .IsRequired();
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.BalanceAfter).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Source).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ReferenceId).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<BinaryWithdrawalRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.RequestedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
        });

        // 🌟 AUTOMATIC POSTGRES REFORMATTER FOR SCHEMAS 🌟
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (!string.IsNullOrEmpty(tableName))
            {
                // Explicitly intercept and force matching your exact Supabase structural layouts
                if (tableName == "BinaryWallets") 
                    entity.SetTableName("binary_wallet");
                else
                    entity.SetTableName(ConvertToSnakeCase(tableName));
            }

            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ConvertToSnakeCase(property.Name));
            }

            foreach (var key in entity.GetKeys())
            {
                key.SetName(ConvertToSnakeCase(key.GetName()));
            }

            foreach (var foreignKey in entity.GetForeignKeys())
            {
                foreignKey.SetConstraintName(ConvertToSnakeCase(foreignKey.GetConstraintName()));
            }

            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ConvertToSnakeCase(index.GetDatabaseName()));
            }
        }
    }

    private static string ConvertToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        return string.Concat(input.Select((x, i) => i > 0 && char.IsUpper(x) ? "_" + x.ToString() : x.ToString())).ToLower();
    }
}

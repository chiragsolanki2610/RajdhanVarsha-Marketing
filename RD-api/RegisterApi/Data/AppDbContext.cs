using Microsoft.EntityFrameworkCore;
using RegisterApi.Models;

namespace RegisterApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();

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

            // 👇 ADD THIS LINE RIGHT HERE 👇
            // This ensures "User" or "Admin" is saved as readable text in your database column
            entity.Property(e => e.Role)
                  .HasConversion<string>()
                  .HasMaxLength(20) // Good practice to give it a max length
                  .IsRequired();
        });
    }
}
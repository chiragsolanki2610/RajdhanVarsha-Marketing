using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;

namespace RegisterApi.Services;

public interface IUserIdGenerator
{
    Task<string> GenerateNextUserIdAsync();
}

public class UserIdGenerator : IUserIdGenerator
{
    private readonly AppDbContext _db;

    public UserIdGenerator(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Generates the next sequential ID in the format RD0001, RD0002, ...
    /// NOTE: This method is NOT thread-safe on its own. Concurrency protection
    /// (locking) is handled by the caller (UserService.RegisterAsync), which
    /// holds a lock across both this call and the subsequent SaveChangesAsync.
    /// A lock only inside this method would not be sufficient, since the
    /// actual insert happens later in the caller.
    /// </summary>
    public async Task<string> GenerateNextUserIdAsync()
    {
        // Find the highest existing numeric suffix
        var lastUser = await _db.Users
            .Where(u => u.UserId.StartsWith("RD"))
            .OrderByDescending(u => u.UserId)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (lastUser != null)
        {
            var numericPart = lastUser.UserId[2..]; // strip "RD"
            if (int.TryParse(numericPart, out int last))
                nextNumber = last + 1;
        }

        // Format: RD + zero-padded 4-digit number → RD0001
        return $"RD{nextNumber:D4}";
    }
}

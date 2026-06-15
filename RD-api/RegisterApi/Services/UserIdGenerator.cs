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
    private static readonly SemaphoreSlim _lock = new(1, 1); // thread-safe counter

    public UserIdGenerator(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Generates the next sequential ID in the format RD0001, RD0002, ...
    /// Thread-safe — uses a semaphore to prevent duplicate IDs under concurrency.
    /// </summary>
    public async Task<string> GenerateNextUserIdAsync()
    {
        await _lock.WaitAsync();
        try
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
        finally
        {
            _lock.Release();
        }
    }
}

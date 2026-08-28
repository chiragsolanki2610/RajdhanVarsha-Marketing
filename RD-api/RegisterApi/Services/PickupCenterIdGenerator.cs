using Microsoft.EntityFrameworkCore;
using RegisterApi.Data;

namespace RegisterApi.Services;

public interface IPickupCenterIdGenerator
{
    Task<string> GenerateNextPucIdAsync();
}

public class PickupCenterIdGenerator : IPickupCenterIdGenerator
{
    private const string Prefix = "RDPUC";
    private const int StartingNumber = 2001;

    private readonly AppDbContext _db;

    public PickupCenterIdGenerator(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Generates the next sequential PUC ID: RDPUC2001, RDPUC2002, ...
    /// NOT thread-safe on its own — caller (AdminPickupCenterController) must
    /// hold a lock across this call AND the subsequent SaveChangesAsync,
    /// exactly like UserIdGenerator/UserService.RegisterAsync.
    /// </summary>
    public async Task<string> GenerateNextPucIdAsync()
    {
        var lastCenter = await _db.PickupCenters
            .Where(p => p.PucId.StartsWith(Prefix))
            .OrderByDescending(p => p.PucId)
            .FirstOrDefaultAsync();

        int nextNumber = StartingNumber;
        if (lastCenter != null)
        {
            var numericPart = lastCenter.PucId[Prefix.Length..];
            if (int.TryParse(numericPart, out int last) && last + 1 > nextNumber)
                nextNumber = last + 1;
        }

        return $"{Prefix}{nextNumber}";
    }
}
using RegisterApi.Services;

namespace RegisterApi.Services;

/// <summary>
/// Runs BinaryPlanService.CorrectOverpaidPairsAsync() automatically so nobody
/// has to remember to trigger it by hand:
///   1. Once, shortly after the app starts — fixes any nodes that are
///      already stuck/wrong (e.g. historical data from before this bug fix).
///   2. Then on a repeating interval — a safety net in case counts ever
///      drift again (race conditions, manual DB edits, future bugs).
///
/// It's safe to run repeatedly/concurrently with normal activation traffic:
/// CorrectOverpaidPairsAsync only ever moves MatchedPairs to
/// min(LeftActiveCount, RightActiveCount) (gated), so a no-op run does
/// nothing, and a real drift gets corrected on the next pass.
/// </summary>
public class PairReconciliationHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PairReconciliationHostedService> _logger;

    // How often the safety-net reconciliation re-runs after the initial pass.
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    // Small delay after startup so the app finishes booting (migrations,
    // DB connection pool warm-up, etc.) before the first run.
    private static readonly TimeSpan InitialDelay = TimeSpan.FromSeconds(30);

    public PairReconciliationHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<PairReconciliationHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(InitialDelay, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunOnceAsync(stoppingToken);

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task RunOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var binaryPlanService = scope.ServiceProvider.GetRequiredService<IBinaryPlanService>();

            _logger.LogInformation("Pair reconciliation: starting automatic pass...");
            var log = await binaryPlanService.CorrectOverpaidPairsAsync();

            var changed = log.Count(l => l.Contains("UNDERPAID") || l.Contains("OVERPAID"));
            if (changed > 0)
            {
                _logger.LogInformation(
                    "Pair reconciliation: corrected {Count} node(s):\n{Details}",
                    changed, string.Join("\n", log));
            }
            else
            {
                _logger.LogInformation("Pair reconciliation: no drift found, all pair counts already correct.");
            }
        }
        catch (Exception ex)
        {
            // Never let a reconciliation failure crash the app or stop future runs.
            _logger.LogError(ex, "Pair reconciliation pass failed — will retry on next interval.");
        }
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LeaderTrip.Infrastructure.Persistence;

/// <summary>ساخت بافت برای ابزار خط فرمان EF Core.</summary>
/// <remarks>
/// <c>dotnet ef migrations add</c> باید بتواند بدون بالا آوردن کل برنامه یک بافت
/// بسازد. رشتهٔ اتصال این‌جا فقط برای تولید SQL به کار می‌رود و هیچ اتصالی برقرار
/// نمی‌شود — به همین دلیل مقدارش می‌تواند ساختگی باشد. برای زدن مهاجرت روی
/// پایگاه دادهٔ واقعی، متغیر محیطی <c>LEADERTRIP_DB</c> را بگذارید.
/// </remarks>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<LeaderTripDbContext>
{
    private const string Fallback =
        "Host=localhost;Port=5432;Database=leadertrip;Username=leadertrip;Password=design-time";

    public LeaderTripDbContext CreateDbContext(string[] args)
    {
        string connectionString =
            Environment.GetEnvironmentVariable("LEADERTRIP_DB") is { Length: > 0 } fromEnvironment
                ? fromEnvironment
                : Fallback;

        var options = new DbContextOptionsBuilder<LeaderTripDbContext>()
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention()
            .Options;

        return new LeaderTripDbContext(options);
    }
}

using LeaderTrip.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LeaderTrip.Infrastructure.Persistence;

/// <summary>ساخت شِما و پرکردن دادهٔ مرجع هنگام بالا آمدن برنامه.</summary>
/// <remarks>
/// <para>
/// چرا دادهٔ اولیه با <c>HasData</c> در مهاجرت‌ها نیست: <c>HasData</c> داده را
/// داخل فایل مهاجرت جاسازی می‌کند. با ۱۴۳ جاذبه یعنی هر اصلاح یک غلط املایی،
/// یک مهاجرت تازه — و تاریخچهٔ مهاجرت‌ها تبدیل می‌شود به لاگ ویرایش محتوا.
/// بدتر از آن، خلاف چیزی است که در <see href="../../../../docs/06-rewrite-architecture.md">سند ۶</see>
/// وعده داده شد: «دادهٔ جاذبه‌ها بدون بیلد مجدد رشد کند».
/// </para>
/// <para>
/// به‌جایش این‌جا هم‌ترازسازی می‌شود: رکورد تازه اضافه، رکورد تغییرکرده به‌روز،
/// و رکوردی که فقط در پایگاه داده هست دست‌نخورده می‌ماند — چون ممکن است تیم
/// محتوا از راه پنل اضافه‌اش کرده باشد. حذف‌کردن آن یعنی اسکریپت راه‌اندازی
/// بی‌صدا کار دیگران را پاک کند.
/// </para>
/// </remarks>
public sealed partial class DatabaseInitializer
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(IServiceScopeFactory scopeFactory, ILogger<DatabaseInitializer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LeaderTripDbContext>();

        await db.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);

        var catalog = SeedCatalog.Instance;

        int cities = await SyncAsync(db, db.Cities, catalog.CityRows, c => c.Id, cancellationToken)
            .ConfigureAwait(false);
        int vehicles = await SyncAsync(db, db.Vehicles, catalog.VehicleRows, v => v.Id, cancellationToken)
            .ConfigureAwait(false);

        // جاذبه‌ها بعد از شهرها، چون کلید خارجی به شهر دارند.
        int pois = await SyncAsync(db, db.PointsOfInterest, catalog.PoiRows, p => p.Id, cancellationToken)
            .ConfigureAwait(false);

        int prices = await SeedPriceBookAsync(db, cancellationToken).ConfigureAwait(false);

        LogSynchronized(_logger, cities, pois, vehicles, prices);
    }

    [LoggerMessage(
        EventId = 20,
        Level = LogLevel.Information,
        Message = "دادهٔ مرجع هم‌تراز شد: {Cities} شهر، {Pois} جاذبه، {Vehicles} خودرو، {Prices} دفترچهٔ قیمت افزوده/به‌روز شد.")]
    private static partial void LogSynchronized(ILogger logger, int cities, int pois, int vehicles, int prices);

    private static async Task<int> SyncAsync<TEntity>(
        LeaderTripDbContext db,
        DbSet<TEntity> set,
        IReadOnlyList<TEntity> desired,
        Func<TEntity, string> keyOf,
        CancellationToken cancellationToken)
        where TEntity : class
    {
        var existing = await set.ToDictionaryAsync(keyOf, StringComparer.Ordinal, cancellationToken)
            .ConfigureAwait(false);

        int touched = 0;

        foreach (var item in desired)
        {
            if (existing.TryGetValue(keyOf(item), out var current))
            {
                // موجودیت‌ها تغییرناپذیرند، پس «به‌روزرسانی» یعنی جایگزینی مقادیر
                // ردیابی‌شده با مقادیر تازه — نه تغییر خود شیء.
                var entry = db.Entry(current);
                entry.CurrentValues.SetValues(item);

                if (entry.State == EntityState.Modified)
                {
                    touched++;
                }
            }
            else
            {
                set.Add(item);
                touched++;
            }
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return touched;
    }

    private static async Task<int> SeedPriceBookAsync(
        LeaderTripDbContext db,
        CancellationToken cancellationToken)
    {
        if (await db.PriceBooks.AnyAsync(cancellationToken).ConfigureAwait(false))
        {
            // دفترچهٔ قیمت نسخه‌دار است و آخرین نسخه ممکن است دستی به‌روز شده
            // باشد. بازنویسی‌اش با پیش‌فرضِ باندل یعنی برگرداندن تورم به عقب.
            return 0;
        }

        db.PriceBooks.Add(new PriceBookRow(0, SeedCatalog.Instance.RawPriceBookJson, DateTimeOffset.UtcNow));
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return 1;
    }
}

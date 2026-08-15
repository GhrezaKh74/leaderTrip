using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;

namespace LeaderTrip.Infrastructure.Seed;

/// <summary>مخزن‌هایی که مستقیم از دادهٔ همراه برنامه می‌خوانند.</summary>
/// <remarks>
/// <para>
/// وقتی رشتهٔ اتصال پایگاه داده پیکربندی نشده باشد این‌ها جای آداپترهای EF Core
/// را می‌گیرند. هدف راحتی توسعه نیست — هدف این است که برنامه یک وابستگی حیاتی
/// کمتر داشته باشد: نمایش یک دموی کامل، اجرای تست‌های یکپارچگی و بالا آوردن
/// محیط توسعه، هیچ‌کدام نباید به یک سرور Postgres گره بخورند.
/// </para>
/// <para>
/// چون منبع هر دو مسیر یکی است (<see cref="SeedCatalog"/>)، این حالت نسخهٔ
/// ساده‌شده یا کهنهٔ حقیقت نیست؛ همان داده است، فقط بدون پایگاه داده.
/// </para>
/// </remarks>
internal sealed class SeedCityRepository : ICityRepository
{
    private readonly Dictionary<string, City> _byId =
        SeedCatalog.Instance.Cities.ToDictionary(c => c.Id, StringComparer.Ordinal);

    public Task<IReadOnlyList<City>> GetAllAsync(CancellationToken cancellationToken) =>
        Task.FromResult(SeedCatalog.Instance.Cities);

    public Task<City?> FindAsync(string id, CancellationToken cancellationToken) =>
        Task.FromResult(_byId.GetValueOrDefault(id));
}

internal sealed class SeedPoiRepository : IPoiRepository
{
    public Task<IReadOnlyList<PointOfInterest>> GetAllAsync(CancellationToken cancellationToken) =>
        Task.FromResult(SeedCatalog.Instance.PointsOfInterest);
}

internal sealed class SeedVehicleRepository : IVehicleRepository
{
    private readonly Dictionary<string, Vehicle> _byId =
        SeedCatalog.Instance.Vehicles.ToDictionary(v => v.Id, StringComparer.Ordinal);

    public Task<IReadOnlyList<Vehicle>> GetAllAsync(CancellationToken cancellationToken) =>
        Task.FromResult(SeedCatalog.Instance.Vehicles);

    public Task<Vehicle?> FindAsync(string id, CancellationToken cancellationToken) =>
        Task.FromResult(_byId.GetValueOrDefault(id));
}

internal sealed class SeedPriceBookProvider : IPriceBookProvider
{
    public Task<PriceBook> GetCurrentAsync(CancellationToken cancellationToken) =>
        Task.FromResult(SeedCatalog.Instance.PriceBook);
}

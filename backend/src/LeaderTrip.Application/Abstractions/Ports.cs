using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Scoring;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Application.Abstractions;

/// <summary>دسترسی به شهرها.</summary>
/// <remarks>
/// پورت‌ها عمداً باریک‌اند. یک <c>IDataAccess</c> چاق یعنی هر مصرف‌کننده به
/// چیزهایی وابسته می‌شود که لازم ندارد — نقض اصل تفکیک اینترفیس، و در عمل
/// یعنی تست‌هایی که باید ده متد بی‌ربط را جعل کنند.
/// </remarks>
public interface ICityRepository
{
    Task<IReadOnlyList<City>> GetAllAsync(CancellationToken cancellationToken);

    Task<City?> FindAsync(string id, CancellationToken cancellationToken);
}

public interface IPoiRepository
{
    Task<IReadOnlyList<PointOfInterest>> GetAllAsync(CancellationToken cancellationToken);
}

public interface IVehicleRepository
{
    Task<IReadOnlyList<Vehicle>> GetAllAsync(CancellationToken cancellationToken);

    Task<Vehicle?> FindAsync(string id, CancellationToken cancellationToken);
}

/// <summary>قیمت‌های پایهٔ جاری.</summary>
/// <remarks>
/// جدا از مخزن‌هاست چون منبعش می‌تواند فرق کند: پایگاه داده، فایل پیکربندی،
/// یا یک سرویس بیرونی. مصرف‌کننده نباید بداند کدام.
/// </remarks>
public interface IPriceBookProvider
{
    Task<PriceBook> GetCurrentAsync(CancellationToken cancellationToken);
}

/// <summary>پیش‌بینی آب‌وهوای بازهٔ سفر.</summary>
/// <remarks>
/// خروجی <see cref="WeatherOutlook"/> است، نه پاسخ خام سرویس هواشناسی: دامنه
/// «دمای بیشینه و احتمال بارش» می‌خواهد، نه ساختار JSON فلان API. اگر سرویس در
/// دسترس نبود <see langword="null"/> برمی‌گردد و برنامه بدون آب‌وهوا ساخته می‌شود —
/// هیچ ویژگی‌ای نباید به یک سرویس بیرونی گروگان باشد.
/// </remarks>
public interface IWeatherProvider
{
    Task<WeatherOutlook?> GetOutlookAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken);
}

/// <summary>وقتی هیچ سرویس هواشناسی پیکربندی نشده است.</summary>
public sealed class NoWeatherProvider : IWeatherProvider
{
    public Task<WeatherOutlook?> GetOutlookAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken) => Task.FromResult<WeatherOutlook?>(null);
}

/// <summary>
/// پیش‌بارگذاری مسافت‌های واقعی جاده برای مجموعه‌ای از نقاط.
/// </summary>
/// <remarks>
/// <para>
/// <see cref="Domain.Routing.IRoadDistanceProvider"/> عمداً همگام است، چون در
/// دلِ حلقهٔ انتخاب مسیر صدا زده می‌شود و نباید هر مقایسه یک درخواست شبکه بزند.
/// این پورت پل آن شکاف است: یک‌بار به‌صورت ناهمگام ماتریس مسافت را می‌گیرد و پر
/// می‌کند، بعد دامنه همگام از آن می‌خواند.
/// </para>
/// <para>
/// پیاده‌سازی پیش‌فرض هیچ کاری نمی‌کند، پس مسیر بدون سرویس مسیریابی هم کار می‌کند.
/// </para>
/// </remarks>
public interface IRoadNetworkWarmup
{
    Task WarmAsync(IReadOnlyList<Coordinate> points, CancellationToken cancellationToken);
}

/// <summary>پیش‌بارگذاری بی‌اثر — برای وقتی سرویس مسیریابی وجود ندارد.</summary>
public sealed class NoRoadNetworkWarmup : IRoadNetworkWarmup
{
    public Task WarmAsync(IReadOnlyList<Coordinate> points, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}

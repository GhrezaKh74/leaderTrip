using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.External.Routing;

/// <summary>کش مسافت‌های جاده‌ای، روی هر پیاده‌سازی دیگری.</summary>
/// <remarks>
/// <para>
/// الگوی تزئین‌گر: کش یک نگرانی مستقل است و <see cref="OsrmRoadDistanceProvider"/>
/// نباید چیزی از آن بداند. اگر فردا سرویس مسیریابی عوض شود، این کلاس دست‌نخورده
/// می‌ماند؛ اگر سیاست کش عوض شود، آداپتر OSRM دست‌نخورده می‌ماند. همان تفکیک
/// مسئولیتی که با یک فیلد <c>_cache</c> داخل آداپتر از بین می‌رفت.
/// </para>
/// <para>
/// چرا ارزش دارد: مسافت جادهٔ تهران–اصفهان بین دو کاربر فرقی نمی‌کند و هفتهٔ
/// آینده هم همان است. بدون کش، هر درخواست برنامه‌ریزی یک ماتریس تازه از سرویس
/// بیرونی می‌گیرد — کندتر، و سریع‌ترین راه برای خوردن سهمیه.
/// </para>
/// </remarks>
internal sealed class CachingRoadDistanceProvider : IRoadDistanceProvider
{
    private readonly IRoadDistanceProvider _inner;
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _lifetime;

    public CachingRoadDistanceProvider(
        IRoadDistanceProvider inner,
        IMemoryCache cache,
        IOptions<RoutingOptions> options)
    {
        _inner = inner;
        _cache = cache;
        _lifetime = TimeSpan.FromHours(options.Value.CacheHours);
    }

    public RoadMeasurement? TryGet(Coordinate origin, Coordinate destination)
    {
        var key = new CacheKey(origin, destination);

        if (_cache.TryGetValue(key, out RoadMeasurement cached))
        {
            return cached;
        }

        var measured = _inner.TryGet(origin, destination);

        if (measured is { } value)
        {
            _cache.Set(key, value, _lifetime);
        }

        // «پیدا نشد» عمداً کش نمی‌شود: نبودِ مسافت معمولاً یعنی سرویس در آن لحظه
        // در دسترس نبود، و کش‌کردنش یعنی خرابیِ گذرا را ساعت‌ها ماندگار کنیم.
        return measured;
    }

    private readonly record struct CacheKey(Coordinate Origin, Coordinate Destination);
}

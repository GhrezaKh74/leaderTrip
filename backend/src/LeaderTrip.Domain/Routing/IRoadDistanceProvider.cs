using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Routing;

/// <summary>دسترسی به مسافت و زمان واقعی جاده بین نقاط.</summary>
/// <remarks>
/// دامنه می‌گوید «به فاصلهٔ جاده‌ای نیاز دارم»، نه «به OSRM نیاز دارم» —
/// وارونگی وابستگی. پیاده‌سازی در لایهٔ Infrastructure است و اگر نبود،
/// <see cref="TravelPlanner"/> بی‌صدا به تخمین برمی‌گردد.
/// </remarks>
public interface IRoadDistanceProvider
{
    /// <summary>
    /// مسافت و زمان واقعی بین دو نقطه، یا <see langword="null"/> اگر در دسترس نبود.
    /// </summary>
    RoadMeasurement? TryGet(Coordinate origin, Coordinate destination);
}

/// <summary>اندازه‌گیری واقعی یک مسیر جاده‌ای.</summary>
/// <param name="Road">مسافت جاده‌ای.</param>
/// <param name="FreeFlowDuration">زمان برای یک خودروی معمولی در جادهٔ خلوت.</param>
public readonly record struct RoadMeasurement(Distance Road, TimeSpan FreeFlowDuration);

/// <summary>وقتی هیچ سرویس مسیریابی در دسترس نیست.</summary>
public sealed class NoRoadDistanceProvider : IRoadDistanceProvider
{
    public static NoRoadDistanceProvider Instance { get; } = new();

    private NoRoadDistanceProvider()
    {
    }

    public RoadMeasurement? TryGet(Coordinate origin, Coordinate destination) => null;
}

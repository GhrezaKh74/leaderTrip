using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Routing;

/// <summary>مسافت و زمان یک مرحلهٔ حرکت را حساب می‌کند.</summary>
/// <remarks>
/// دو منبع دارد و ترجیحش روشن است: اگر مسیر واقعی جاده در دسترس باشد از آن
/// استفاده می‌کند، وگرنه فاصلهٔ هوایی را با ضریب پیچش تخمین می‌زند. در هر دو
/// حالت منبع را در <see cref="TravelLeg.Source"/> اعلام می‌کند.
/// </remarks>
public sealed class TravelPlanner
{
    /// <summary>سرعت پایهٔ برون‌شهری، کیلومتر بر ساعت.</summary>
    public const double BaseSpeedKmh = 85d;

    private readonly IRoadDistanceProvider _roadDistances;

    public TravelPlanner(IRoadDistanceProvider roadDistances) => _roadDistances = roadDistances;

    /// <summary>ضریب تبدیل فاصلهٔ هوایی به جاده‌ای.</summary>
    public static double DetourFactor(Terrain terrain) => terrain switch
    {
        Terrain.Freeway => 1.15,
        Terrain.Plain => 1.25,
        Terrain.Mountain => 1.45,
        Terrain.Dirt => 1.60,
        _ => 1.25,
    };

    /// <summary>ضریب سرعت به تفکیک نوع زمین.</summary>
    public static double TerrainSpeedFactor(Terrain terrain) => terrain switch
    {
        Terrain.Freeway => 1.10,
        Terrain.Plain => 1.00,
        Terrain.Mountain => 0.75,
        Terrain.Dirt => 0.50,
        _ => 1.00,
    };

    /// <summary>حدس نوع زمین از روی اقلیم دو سر مسیر.</summary>
    /// <remarks>گذر از خزر به فلات مرکزی یعنی عبور از البرز.</remarks>
    public static Terrain InferTerrain(Climate from, Climate to, Distance straightLine)
    {
        bool mountainous = from == Climate.Mountain || to == Climate.Mountain;
        bool crossesAlborz = (from == Climate.Caspian) != (to == Climate.Caspian)
                             && straightLine.Kilometers > 40;

        if (mountainous || crossesAlborz)
        {
            return Terrain.Mountain;
        }

        return straightLine.Kilometers > 200 ? Terrain.Freeway : Terrain.Plain;
    }

    /// <summary>محاسبهٔ کامل یک مرحلهٔ حرکت.</summary>
    /// <param name="from">نقطهٔ شروع.</param>
    /// <param name="to">نقطهٔ پایان.</param>
    /// <param name="terrain">نوع زمین مسیر.</param>
    /// <param name="vehicle">خودرویی که سفر با آن انجام می‌شود.</param>
    /// <param name="pace">
    /// ضریب سرعت گروه — گروهی با کودک یا سالمند و در هوای بد واقعاً کندتر است.
    /// </param>
    /// <returns>مرحلهٔ حرکت با مسافت، زمان و منبع مسافت.</returns>
    public TravelLeg Plan(
        Coordinate from,
        Coordinate to,
        Terrain terrain,
        Vehicle vehicle,
        double pace = 1d)
    {
        double slowdown = Math.Max(0.3, vehicle.SpeedFactor * pace);

        if (_roadDistances.TryGet(from, to) is { } measured)
        {
            // زمان سرویس مسیریابی برای یک خودروی معمولی در جادهٔ خلوت است؛
            // اتوبوسِ پر از بچه با همان سرعت حرکت نمی‌کند
            return new TravelLeg(
                measured.Road,
                measured.FreeFlowDuration / slowdown,
                terrain,
                DistanceSource.Routed);
        }

        var straight = from.StraightLineTo(to);
        var road = straight * DetourFactor(terrain);
        double speed = BaseSpeedKmh * slowdown * TerrainSpeedFactor(terrain);
        var duration = TimeSpan.FromHours(road.Kilometers / speed);

        return new TravelLeg(road, duration, terrain, DistanceSource.Estimated);
    }
}

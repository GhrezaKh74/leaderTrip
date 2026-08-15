using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Planning;

/// <summary>انتخاب و ترتیب جاذبه‌ها برای یک سفر.</summary>
/// <remarks>
/// <para>
/// این «مسئلهٔ جهت‌یابی» است، نه رتبه‌بندی: بیشترین امتیاز ممکن در چارچوب یک
/// بودجهٔ زمانی. برداشتن N جاذبهٔ با بالاترین امتیاز — که تلاش اول نسخهٔ قبلی
/// بود — مجموعه‌ای پخش‌شده در چند جهت مخالف می‌دهد که در یک سفر جاده‌ای اصلاً
/// شدنی نیست.
/// </para>
/// <para>
/// راه‌حل: درج حریصانه بر پایهٔ «امتیاز به ازای دقیقهٔ اضافه‌شده به سفر»، و درج
/// در ارزان‌ترین جای مسیر. مسیر خودبه‌خود در یک راستا شکل می‌گیرد.
/// </para>
/// </remarks>
public sealed class ItinerarySelector
{
    /// <summary>وقتی جاذبهٔ اجباری وجود دارد، این کسر از بودجهٔ رانندگی دست‌نخورده می‌ماند.</summary>
    public const double PinnedHeadroom = 0.85;

    private readonly TravelPlanner _travelPlanner;

    public ItinerarySelector(TravelPlanner travelPlanner) => _travelPlanner = travelPlanner;

    /// <summary>ترتیب نهایی بازدیدها.</summary>
    /// <param name="candidates">جاذبه‌های واجد شرایط، با امتیازشان.</param>
    /// <param name="request">پارامترهای سفر.</param>
    /// <returns>جاذبه‌ها به ترتیب بازدید.</returns>
    public IReadOnlyList<PointOfInterest> Select(
        IReadOnlyList<ScoredPoi> candidates,
        SelectionRequest request)
    {
        var route = new List<PointOfInterest>();
        var used = new HashSet<string>(StringComparer.Ordinal);

        // جاذبه‌های اجباری بی‌چون‌وچرا وارد مسیر می‌شوند
        foreach (var candidate in candidates.Where(c => request.PinnedPoiIds.Contains(c.Poi.Id)))
        {
            route.Add(candidate.Poi);
            used.Add(candidate.Poi.Id);
        }

        double headroom = request.PinnedPoiIds.Count > 0 ? PinnedHeadroom : 1d;
        var driveBudget = request.DailyDrivingCap * request.Days * headroom;
        var timeBudget = request.UsableHoursPerDay * request.Days;

        var totalDrive = RouteDrivingTime(route, request);
        var totalVisit = route.Aggregate(
            TimeSpan.Zero,
            (sum, poi) => sum + Stretch(poi.VisitDuration, request.VisitStretch));

        while (true)
        {
            PointOfInterest? best = null;
            int bestPosition = 0;
            double bestRatio = double.NegativeInfinity;
            TimeSpan bestDrive = TimeSpan.Zero;

            foreach (var candidate in candidates)
            {
                if (used.Contains(candidate.Poi.Id))
                {
                    continue;
                }

                var visit = Stretch(candidate.Poi.VisitDuration, request.VisitStretch);

                for (int position = 0; position <= route.Count; position++)
                {
                    var trial = new List<PointOfInterest>(route);
                    trial.Insert(position, candidate.Poi);

                    var drive = RouteDrivingTime(trial, request);
                    if (drive > driveBudget || totalVisit + visit + drive > timeBudget)
                    {
                        continue;
                    }

                    var added = drive - totalDrive + visit;
                    double ratio = candidate.Score / Math.Max(1, added.TotalMinutes);

                    if (ratio > bestRatio)
                    {
                        bestRatio = ratio;
                        best = candidate.Poi;
                        bestPosition = position;
                        bestDrive = drive;
                    }
                }
            }

            if (best is null)
            {
                break;
            }

            route.Insert(bestPosition, best);
            used.Add(best.Id);
            totalDrive = bestDrive;
            totalVisit += Stretch(best.VisitDuration, request.VisitStretch);
        }

        return route;
    }

    private static TimeSpan Stretch(TimeSpan duration, double factor) =>
        TimeSpan.FromMinutes(duration.TotalMinutes * factor);

    private TimeSpan RouteDrivingTime(IReadOnlyList<PointOfInterest> route, SelectionRequest request)
    {
        var total = TimeSpan.Zero;
        var current = request.Origin;
        var currentClimate = request.OriginClimate;

        foreach (var poi in route)
        {
            total += LegTime(current, currentClimate, poi.Location, request.ClimateOf(poi), request);
            current = poi.Location;
            currentClimate = request.ClimateOf(poi);
        }

        if (request.ReturnsToOrigin)
        {
            total += LegTime(current, currentClimate, request.Origin, request.OriginClimate, request);
        }

        return total;
    }

    private TimeSpan LegTime(
        Coordinate from,
        Climate fromClimate,
        Coordinate to,
        Climate toClimate,
        SelectionRequest request)
    {
        var straight = from.StraightLineTo(to);
        var terrain = TravelPlanner.InferTerrain(fromClimate, toClimate, straight);
        return _travelPlanner.Plan(from, to, terrain, request.Vehicle, request.Pace).Duration;
    }
}

/// <summary>پارامترهایی که انتخاب مسیر به آن‌ها نیاز دارد.</summary>
public sealed record SelectionRequest
{
    public required Coordinate Origin { get; init; }

    public required Climate OriginClimate { get; init; }

    public required Vehicle Vehicle { get; init; }

    public required int Days { get; init; }

    public required TimeSpan DailyDrivingCap { get; init; }

    /// <summary>ساعات مفید هر روز، منهای وعده‌های غذایی و توقف‌ها.</summary>
    public required TimeSpan UsableHoursPerDay { get; init; }

    public required bool ReturnsToOrigin { get; init; }

    public required double Pace { get; init; }

    /// <summary>ضریب کش‌آمدن مدت بازدید برای این گروه.</summary>
    public required double VisitStretch { get; init; }

    public required IReadOnlySet<string> PinnedPoiIds { get; init; }

    /// <summary>اقلیم شهر هر جاذبه — برای حدس نوع زمین مسیر.</summary>
    public required IReadOnlyDictionary<string, Climate> CityClimates { get; init; }

    internal Climate ClimateOf(PointOfInterest poi) =>
        CityClimates.TryGetValue(poi.CityId, out var climate) ? climate : Climate.Plain;
}

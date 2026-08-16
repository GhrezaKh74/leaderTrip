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

    /// <summary>نیم‌پهنای پنجرهٔ جهت برای سفر حلقه‌ای کوتاه، بر حسب طول سفر (درجه).</summary>
    /// <remarks>
    /// سفر کوتاه باید یک جهت داشته باشد. سفر بلند (۵ روز به بالا) اصلاً پنجره
    /// نمی‌گیرد: حلقهٔ بزرگ چندجهته حقِ اوست و درج حریصانه + ۲-opt خودش آن را
    /// منسجم می‌چیند؛ محدودکردنش فقط جاذبه‌های خوبِ جهت‌های دیگر را می‌سوزاند.
    /// </remarks>
    private static double SectorHalfWidth(int days) => days switch
    {
        <= 2 => 50,
        _ => 75,
    };

    /// <summary>آیا این سفر حلقه‌ای باید به یک جهت محدود شود؟</summary>
    private static bool UseSectors(int days) => days <= 4;

    /// <summary>جاذبه‌های نزدیک مبدأ عضو هر جهتی حساب می‌شوند — «سرِ راهِ خروج»اند.</summary>
    private static readonly Distance NearOrigin = Distance.FromKilometers(60);

    /// <summary>ترتیب نهایی بازدیدها.</summary>
    /// <param name="candidates">جاذبه‌های واجد شرایط، با امتیازشان.</param>
    /// <param name="request">پارامترهای سفر.</param>
    /// <returns>جاذبه‌ها به ترتیب بازدید.</returns>
    /// <remarks>
    /// سفر حلقه‌ای اول جهت انتخاب می‌کند: نامزدها به پنجره‌های جهت‌دار دور مبدأ
    /// تقسیم می‌شوند و بهترین پنجره برنده است. بدون این، درج حریصانه در سفر
    /// کوتاه، قم و قزوین را با هم برمی‌داشت — دو جهت مخالف، با گذر دوباره از
    /// روی مبدأ. سفر مقصددار جهتش را از خود مقصد می‌گیرد و نیازی به این ندارد.
    /// در پایان، گذر ۲-opt گره‌های ضربدریِ باقی‌مانده را باز می‌کند.
    /// </remarks>
    public IReadOnlyList<PointOfInterest> Select(
        IReadOnlyList<ScoredPoi> candidates,
        SelectionRequest request)
    {
        var cache = new Dictionary<(Coordinate, Coordinate), TimeSpan>();

        var route = request.Destination is null && UseSectors(request.Days)
            ? SelectBestSector(candidates, request, cache)
            : SelectCore(candidates, request, cache);

        return Orient(Improve(route, request, cache), request);
    }

    /// <summary>
    /// جهت پیمایش حلقه: دو سوی یک حلقهٔ رفت‌وبرگشتی هم‌طول‌اند، ولی برای مسافر
    /// یکی نیستند — شروع با توقف‌های نزدیک، روز اول را سبک می‌کند و راهِ دور را
    /// به میانهٔ سفر می‌برد، به‌جای چهار ساعت رانندگیِ یک‌نفس در صبح روز اول.
    /// </summary>
    private static IReadOnlyList<PointOfInterest> Orient(
        IReadOnlyList<PointOfInterest> route,
        SelectionRequest request)
    {
        if (route.Count < 2 || request.Destination is not null || !request.ReturnsToOrigin
            || request.PinnedPoiIds.Count > 0)
        {
            return route;
        }

        var firstLeg = request.Origin.StraightLineTo(route[0].Location);
        var lastLeg = request.Origin.StraightLineTo(route[^1].Location);

        return firstLeg <= lastLeg ? route : [.. route.Reverse()];
    }

    private IReadOnlyList<PointOfInterest> SelectBestSector(
        IReadOnlyList<ScoredPoi> candidates,
        SelectionRequest request,
        Dictionary<(Coordinate, Coordinate), TimeSpan> cache)
    {
        double halfWidth = SectorHalfWidth(request.Days);
        var scoreById = candidates.ToDictionary(c => c.Poi.Id, c => c.Score, StringComparer.Ordinal);

        IReadOnlyList<PointOfInterest> best = [];
        double bestScore = double.NegativeInfinity;

        for (int center = 0; center < 360; center += 45)
        {
            var window = candidates
                .Where(c => request.PinnedPoiIds.Contains(c.Poi.Id)
                    || request.Origin.StraightLineTo(c.Poi.Location) <= NearOrigin
                    || AngularDistance(Bearing(request.Origin, c.Poi.Location), center) <= halfWidth)
                .ToList();

            if (window.Count == 0)
            {
                continue;
            }

            var route = SelectCore(window, request, cache);
            double score = route.Sum(poi => scoreById.GetValueOrDefault(poi.Id));

            // برابری امتیاز به نفع مسیر کوتاه‌تر می‌شکند — همان جهت‌داری واقعی
            if (score > bestScore
                || (Math.Abs(score - bestScore) < 0.001
                    && RouteDrivingTime(route, request, cache) < RouteDrivingTime(best, request, cache)))
            {
                bestScore = score;
                best = route;
            }
        }

        return best;
    }

    /// <summary>جهت جغرافیایی از مبدأ به نقطه، صفر تا ۳۶۰ درجه.</summary>
    private static double Bearing(Coordinate from, Coordinate to)
    {
        double meanLatitude = double.DegreesToRadians((from.Latitude + to.Latitude) / 2);
        double x = (to.Longitude - from.Longitude) * Math.Cos(meanLatitude);
        double y = to.Latitude - from.Latitude;
        double degrees = double.RadiansToDegrees(Math.Atan2(x, y));

        return degrees < 0 ? degrees + 360 : degrees;
    }

    private static double AngularDistance(double a, double b)
    {
        double difference = Math.Abs(a - b) % 360;

        return difference > 180 ? 360 - difference : difference;
    }

    private List<PointOfInterest> SelectCore(
        IReadOnlyList<ScoredPoi> candidates,
        SelectionRequest request,
        Dictionary<(Coordinate, Coordinate), TimeSpan> cache)
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

        var totalDrive = RouteDrivingTime(route, request, cache);
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

                    var drive = RouteDrivingTime(trial, request, cache);
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

    /// <summary>گذر بهبود ۲-opt: بازکردن گره‌های ضربدری با وارونه‌کردن پاره‌مسیر.</summary>
    /// <remarks>
    /// درج حریصانه گاهی ترتیبی می‌سازد که مجموعش خوب است ولی وسطش ضربدر دارد.
    /// وارونه‌کردن پاره‌ای که مسیر را کوتاه‌تر کند، انتخاب را عوض نمی‌کند — فقط
    /// همان جاذبه‌ها را به ترتیبِ راننده‌پسندتر می‌چیند.
    /// </remarks>
    private IReadOnlyList<PointOfInterest> Improve(
        IReadOnlyList<PointOfInterest> route,
        SelectionRequest request,
        Dictionary<(Coordinate, Coordinate), TimeSpan> cache)
    {
        if (route.Count < 4)
        {
            return route;
        }

        var current = route.ToList();
        var currentTime = RouteDrivingTime(current, request, cache);
        bool improved = true;

        while (improved)
        {
            improved = false;

            for (int i = 0; i < current.Count - 1 && !improved; i++)
            {
                for (int j = i + 1; j < current.Count; j++)
                {
                    var trial = new List<PointOfInterest>(current);
                    trial.Reverse(i, j - i + 1);

                    var trialTime = RouteDrivingTime(trial, request, cache);

                    if (trialTime < currentTime - TimeSpan.FromMinutes(1))
                    {
                        current = trial;
                        currentTime = trialTime;
                        improved = true;
                        break;
                    }
                }
            }
        }

        return current;
    }

    private static TimeSpan Stretch(TimeSpan duration, double factor) =>
        TimeSpan.FromMinutes(duration.TotalMinutes * factor);

    private TimeSpan RouteDrivingTime(
        IReadOnlyList<PointOfInterest> route,
        SelectionRequest request,
        Dictionary<(Coordinate, Coordinate), TimeSpan> cache)
    {
        var total = TimeSpan.Zero;
        var current = request.Origin;
        var currentClimate = request.OriginClimate;

        foreach (var poi in route)
        {
            total += LegTime(current, currentClimate, poi.Location, request.ClimateOf(poi), request, cache);
            current = poi.Location;
            currentClimate = request.ClimateOf(poi);
        }

        // پای پایانی تا مقصد جزو هزینهٔ هر گزینه است. همین یک جمع، درج حریصانه
        // را مقصدآگاه می‌کند: جاذبهٔ خارج از راهرو کل مسیر را گران می‌کند و
        // خودبه‌خود می‌بازد — بدون هیچ قاعدهٔ جداگانه‌ای.
        if (request.Destination is { } destination)
        {
            total += LegTime(current, currentClimate, destination, request.DestinationClimate, request, cache);
            current = destination;
            currentClimate = request.DestinationClimate;
        }

        if (request.ReturnsToOrigin)
        {
            total += LegTime(current, currentClimate, request.Origin, request.OriginClimate, request, cache);
        }

        return total;
    }

    // زمان پای مسیر در طول یک انتخاب هزاران بار برای جفت‌های تکراری پرسیده
    // می‌شود (هر درج آزمایشی کل مسیر را جمع می‌زند) — یادسپاری ارزان است و لازم.
    private TimeSpan LegTime(
        Coordinate from,
        Climate fromClimate,
        Coordinate to,
        Climate toClimate,
        SelectionRequest request,
        Dictionary<(Coordinate, Coordinate), TimeSpan> cache)
    {
        if (cache.TryGetValue((from, to), out var cached))
        {
            return cached;
        }

        var straight = from.StraightLineTo(to);
        var terrain = TravelPlanner.InferTerrain(fromClimate, toClimate, straight);
        var duration = _travelPlanner.Plan(from, to, terrain, request.Vehicle, request.Pace).Duration;

        cache[(from, to)] = duration;

        return duration;
    }
}

/// <summary>پارامترهایی که انتخاب مسیر به آن‌ها نیاز دارد.</summary>
public sealed record SelectionRequest
{
    public required Coordinate Origin { get; init; }

    public required Climate OriginClimate { get; init; }

    /// <summary>مقصد سفر؛ <see langword="null"/> یعنی سفر حلقه‌ای دور مبدأ.</summary>
    public Coordinate? Destination { get; init; }

    public Climate DestinationClimate { get; init; } = Climate.Plain;

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

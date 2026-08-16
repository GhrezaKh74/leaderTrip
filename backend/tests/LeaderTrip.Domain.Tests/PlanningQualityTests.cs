using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

/// <summary>
/// کیفیت برنامه: ساعت کاری، پرشدن روزها، برنامهٔ شب و جهت‌داری مسیر —
/// همان چهار ضعفی که بازبینی موتور نشانشان داد.
/// </summary>
public sealed class PlanningQualityTests
{
    private static readonly City TehranCity =
        new("tehran", "تهران", "تهران", TestData.Tehran, 1.3m, 3, Climate.Plain);

    private static readonly City IsfahanCity =
        new("isfahan", "اصفهان", "اصفهان", TestData.Isfahan, 1.0m, 3, Climate.Plain);

    private static DayScheduler Scheduler() => new(new TravelPlanner(NoRoadDistanceProvider.Instance));

    private static ScheduleRequest Request(
        int days = 2,
        double dayEndHour = 21,
        IReadOnlyList<PointOfInterest>? nightPois = null) => new()
    {
        StartDate = new DateOnly(2026, 5, 2),
        Days = days,
        OriginCity = TehranCity,
        Vehicle = TestData.Sedan(),
        Style = TravelStyle.Balanced,
        DayStart = TimeSpan.FromHours(8),
        DayEnd = TimeSpan.FromHours(dayEndHour),
        DailyDrivingCap = TimeSpan.FromHours(5),
        ReturnsToOrigin = true,
        Pace = 1,
        VisitStretch = 1,
        Cities = new Dictionary<string, City>(StringComparer.Ordinal)
        {
            [TehranCity.Id] = TehranCity,
            [IsfahanCity.Id] = IsfahanCity,
        },
        StayCities = [TehranCity, IsfahanCity],
        NightPois = nightPois ?? [],
    };

    // ─── ساعت کاری جاذبه ───

    [Fact]
    public void EarliestVisitStart_BumpsToOpening_AndRejectsAfterClose()
    {
        var museum = TestData.Poi(
            "museum", opensAt: TimeSpan.FromHours(9), closesAt: TimeSpan.FromHours(17));

        // زودتر از بازشدن رسیده‌ایم: شروع به ساعت ۹ هل داده می‌شود
        Assert.Equal(
            TimeSpan.FromHours(9),
            museum.EarliestVisitStart(TimeSpan.FromHours(8), TimeSpan.FromHours(1)));

        // بازدیدی که پیش از بسته‌شدن تمام نشود، شدنی نیست
        Assert.Null(museum.EarliestVisitStart(TimeSpan.FromHours(16.5), TimeSpan.FromHours(1)));

        // جاذبهٔ بی‌ساعت (طبیعت) همیشه باز است
        Assert.Equal(
            TimeSpan.FromHours(22),
            TestData.Poi("lake").EarliestVisitStart(TimeSpan.FromHours(22), TimeSpan.FromHours(1)));
    }

    /// <summary>جاذبهٔ در-بسته روز را تمام نمی‌کند؛ نوبت به شدنیِ بعدی صف می‌رسد.</summary>
    [Fact]
    public void ClosedPoi_IsSkipped_NotDayEnding()
    {
        List<PointOfInterest> route =
        [
            TestData.Poi("long-visit", visitMinutes: 8 * 60),
            // بعدازظهر که نوبتش می‌شود بسته است
            TestData.Poi("closes-early", opensAt: TimeSpan.FromHours(9), closesAt: TimeSpan.FromHours(12)),
            TestData.Poi("always-open", visitMinutes: 45),
        ];

        var result = Scheduler().Schedule(route, Request(days: 1, dayEndHour: 23));
        var day = Assert.Single(result.Days);

        Assert.Contains("always-open", day.VisitedPoiIds);
        Assert.DoesNotContain("closes-early", day.VisitedPoiIds);
    }

    // ─── برنامهٔ شب ───

    [Fact]
    public void EveningStroll_AppearsAfterDinner_WhenStayCityHasNightPoi()
    {
        var bazaar = TestData.Poi(
            "bazaar", cityId: "isfahan", location: TestData.Isfahan,
            nightSuitable: true, visitMinutes: 90);

        List<PointOfInterest> route = [TestData.Poi("sight", cityId: "isfahan", location: TestData.Isfahan)];

        var result = Scheduler().Schedule(
            route, Request(days: 2, dayEndHour: 23, nightPois: [bazaar]));

        var firstDay = result.Days[0];
        var stroll = firstDay.Blocks.SingleOrDefault(b => b.PoiId == "bazaar");

        Assert.NotNull(stroll);

        var dinner = firstDay.Blocks.Single(b => b.Kind == BlockKind.Meal && b.Title == "شام");

        Assert.True(stroll.StartsAt >= dinner.StartsAt + dinner.Duration, "گشت شبانه باید بعد از شام باشد");
    }

    /// <summary>جاذبهٔ شبانه‌ای که روز دیده شده، شب دوباره پیشنهاد نمی‌شود.</summary>
    [Fact]
    public void EveningStroll_SkipsAlreadyVisited()
    {
        var bridge = TestData.Poi(
            "bridge", cityId: "isfahan", location: TestData.Isfahan, nightSuitable: true);

        var result = Scheduler().Schedule(
            [bridge], Request(days: 2, dayEndHour: 23, nightPois: [bridge]));

        int appearances = result.Days
            .SelectMany(d => d.Blocks)
            .Count(b => b.PoiId == "bridge");

        Assert.Equal(1, appearances);
    }

    // ─── پرشدن روز ───

    /// <summary>
    /// جاذبهٔ دورِ وسطِ صف نباید روز را بکشد: نزدیکِ بعدی جایش می‌نشیند.
    /// </summary>
    [Fact]
    public void FarPoiMidQueue_DoesNotKillTheAfternoon()
    {
        List<PointOfInterest> route =
        [
            TestData.Poi("near-1", visitMinutes: 120),
            // اصفهان: پایش در سقف رانندگیِ امروز جا نمی‌شود
            TestData.Poi("far", cityId: "isfahan", location: TestData.Isfahan, visitMinutes: 60),
            TestData.Poi("near-2", visitMinutes: 60),
        ];

        var result = Scheduler().Schedule(route, Request(days: 1, dayEndHour: 21));
        var day = Assert.Single(result.Days);

        Assert.Contains("near-1", day.VisitedPoiIds);
        Assert.Contains("near-2", day.VisitedPoiIds);
    }

    // ─── جهت‌داری سفر حلقه‌ای ───

    /// <summary>
    /// سفر کوتاه دو جهت مخالف را قاطی نمی‌کند: قم (جنوب) و قزوین (شمال غربی)
    /// هر دو پرامتیازند، ولی مسیرِ برنده فقط یک سمت را برمی‌دارد.
    /// </summary>
    [Fact]
    public void ShortLoop_PicksOneDirection_NotBoth()
    {
        var qom = Coordinate.Create(34.64, 50.88).Value;
        var qazvin = Coordinate.Create(36.27, 50.00).Value;

        List<ScoredPoi> candidates =
        [
            new(TestData.Poi("south-1", location: qom), 120),
            new(TestData.Poi("south-2", location: qom), 100),
            new(TestData.Poi("north-1", location: qazvin), 120),
            new(TestData.Poi("north-2", location: qazvin), 100),
        ];

        var selector = new ItinerarySelector(new TravelPlanner(NoRoadDistanceProvider.Instance));

        var route = selector.Select(candidates, new SelectionRequest
        {
            Origin = TestData.Tehran,
            OriginClimate = Climate.Plain,
            Vehicle = TestData.Sedan(),
            Days = 2,
            DailyDrivingCap = TimeSpan.FromHours(5),
            UsableHoursPerDay = TimeSpan.FromHours(10),
            ReturnsToOrigin = true,
            Pace = 1,
            VisitStretch = 1,
            PinnedPoiIds = new HashSet<string>(StringComparer.Ordinal),
            CityClimates = new Dictionary<string, Climate> { ["tehran"] = Climate.Plain },
        });

        bool hasSouth = route.Any(p => p.Id.StartsWith("south", StringComparison.Ordinal));
        bool hasNorth = route.Any(p => p.Id.StartsWith("north", StringComparison.Ordinal));

        Assert.True(route.Count > 0, "مسیری انتخاب نشد");
        Assert.False(hasSouth && hasNorth, "مسیر کوتاه نباید دو جهت مخالف را قاطی کند");
    }
}

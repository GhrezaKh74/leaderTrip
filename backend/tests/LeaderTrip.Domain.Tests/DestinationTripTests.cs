using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.Specifications.Poi;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

/// <summary>سفر مقصددار: راهروی مبدأ تا مقصد، و پایان روز آخر در مقصد.</summary>
public sealed class DestinationTripTests
{
    private static readonly Coordinate Tehran = TestData.Tehran;
    private static readonly Coordinate Isfahan = TestData.Isfahan;

    /// <summary>قم تقریباً روی خط تهران–اصفهان است.</summary>
    private static readonly Coordinate Qom = Coordinate.Create(34.64, 50.88).Value;

    /// <summary>رشت به‌کل خلاف جهت اصفهان است.</summary>
    private static readonly Coordinate Rasht = Coordinate.Create(37.28, 49.59).Value;

    // ─── هندسهٔ راهرو ───

    [Fact]
    public void PointOnTheCorridor_IsNearTheSegment()
    {
        var distance = Qom.StraightLineToSegment(Tehran, Isfahan);

        Assert.True(distance.Kilometers < 60, $"قم باید نزدیک راهرو باشد؛ شد {distance.Kilometers:0} کیلومتر");
    }

    [Fact]
    public void PointBehindTheOrigin_IsFarFromTheSegment()
    {
        var distance = Rasht.StraightLineToSegment(Tehran, Isfahan);

        // فاصلهٔ رشت تا خودِ تهران حدود ۲۵۰ کیلومتر است؛ تا پاره‌خط نباید کمتر شود
        Assert.True(distance.Kilometers > 200, $"رشت باید دور از راهرو باشد؛ شد {distance.Kilometers:0} کیلومتر");
    }

    [Fact]
    public void CorridorSpecification_AcceptsOnRoute_AndRejectsBackwards()
    {
        var spec = new WithinCorridorSpecification(Tehran, Isfahan, Distance.FromKilometers(80));

        Assert.True(spec.Evaluate(TestData.Poi("qom", location: Qom)).IsSatisfied);
        Assert.False(spec.Evaluate(TestData.Poi("rasht", location: Rasht)).IsSatisfied);
    }

    // ─── انتخاب مسیر ───

    private static SelectionRequest SelectionRequest(Coordinate? destination) => new()
    {
        Origin = Tehran,
        OriginClimate = Climate.Plain,
        Destination = destination,
        DestinationClimate = Climate.Plain,
        Vehicle = TestData.Sedan(),
        Days = 1,
        DailyDrivingCap = TimeSpan.FromHours(7),
        UsableHoursPerDay = TimeSpan.FromHours(12),
        ReturnsToOrigin = false,
        Pace = 1,
        VisitStretch = 1,
        PinnedPoiIds = new HashSet<string>(StringComparer.Ordinal),
        CityClimates = new Dictionary<string, Climate> { ["tehran"] = Climate.Plain },
    };

    /// <summary>
    /// با مقصد، پای پایانی تا مقصد جزو بودجهٔ هر گزینه است: جاذبهٔ خلاف جهت —
    /// حتی با امتیاز بالاتر — دیگر در بودجهٔ رانندگی جا نمی‌شود و می‌بازد؛
    /// جاذبهٔ سر راه جا می‌شود.
    /// </summary>
    [Fact]
    public void WithDestination_TheBackwardsPoi_LosesToTheOnRouteOne()
    {
        var selector = new ItinerarySelector(new TravelPlanner(NoRoadDistanceProvider.Instance));

        List<ScoredPoi> candidates =
        [
            new(TestData.Poi("on-route", location: Qom), 5),
            // امتیاز بالاتر، ولی خلاف جهت مقصد
            new(TestData.Poi("backwards", location: Rasht), 8),
        ];

        var withDestination = selector.Select(candidates, SelectionRequest(Isfahan));

        Assert.Contains(withDestination, poi => poi.Id == "on-route");
        Assert.DoesNotContain(withDestination, poi => poi.Id == "backwards");
    }

    // ─── زمان‌بندی ───

    private static readonly City TehranCity =
        new("tehran", "تهران", "تهران", Tehran, 1.3m, 3, Climate.Plain);

    private static readonly City IsfahanCity =
        new("isfahan", "اصفهان", "اصفهان", Isfahan, 1.0m, 3, Climate.Plain);

    private static readonly City QomCity =
        new("qom", "قم", "قم", Qom, 1.0m, 3, Climate.Plain);

    private static ScheduleRequest ScheduleRequest(City? destination) => new()
    {
        StartDate = new DateOnly(2026, 5, 2),
        Days = 2,
        OriginCity = TehranCity,
        DestinationCity = destination,
        Vehicle = TestData.Sedan(),
        Style = TravelStyle.Balanced,
        DayStart = TimeSpan.FromHours(8),
        DayEnd = TimeSpan.FromHours(21),
        DailyDrivingCap = TimeSpan.FromHours(7),
        ReturnsToOrigin = false,
        Pace = 1,
        VisitStretch = 1,
        Cities = new Dictionary<string, City>(StringComparer.Ordinal)
        {
            [TehranCity.Id] = TehranCity,
            [QomCity.Id] = QomCity,
            [IsfahanCity.Id] = IsfahanCity,
        },
        StayCities = [TehranCity, QomCity, IsfahanCity],
    };

    [Fact]
    public void LastDay_EndsAtTheDestination()
    {
        var scheduler = new DayScheduler(new TravelPlanner(NoRoadDistanceProvider.Instance));

        var result = scheduler.Schedule(
            [TestData.Poi("qom-poi", location: Qom, cityId: "qom")],
            ScheduleRequest(IsfahanCity));

        Assert.Equal("isfahan", result.Days[^1].BaseCityId);
        Assert.Contains(
            result.Days[^1].Blocks,
            block => block.Kind == BlockKind.Drive && block.Title.Contains("مقصد", StringComparison.Ordinal));
    }

    /// <summary>بدون مقصد، رفتار قبلی سرجایش است — روز آخر نزدیک آخرین بازدید می‌ماند.</summary>
    [Fact]
    public void WithoutDestination_TheOldBehaviourIsUntouched()
    {
        var scheduler = new DayScheduler(new TravelPlanner(NoRoadDistanceProvider.Instance));

        var result = scheduler.Schedule(
            [TestData.Poi("qom-poi", location: Qom, cityId: "qom")],
            ScheduleRequest(destination: null));

        Assert.Equal("qom", result.Days[^1].BaseCityId);
    }
}

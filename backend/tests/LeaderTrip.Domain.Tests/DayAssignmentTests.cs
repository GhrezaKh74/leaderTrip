using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.ValueObjects;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Routing;

namespace LeaderTrip.Domain.Tests;

/// <summary>ویرایش دستی، به‌صورت قید ورودی.</summary>
/// <remarks>
/// نکتهٔ اصلی این است که جابه‌جایی دستی برنامه را <b>بازمی‌سازد</b>، نه اینکه
/// خروجی را دستکاری کند. اگر خروجی مستقیم جابه‌جا می‌شد، مسافت و ساعت و هزینه
/// با آنچه روی صفحه است نمی‌خواند.
/// </remarks>
public sealed class DayAssignmentTests
{
    private static ScheduleRequest Request(Dictionary<string, int>? assignments = null) => new()
    {
        StartDate = new DateOnly(2026, 5, 2),
        Days = 3,
        OriginCity = TehranCity,
        Vehicle = TestData.Sedan(),
        Style = TravelStyle.Balanced,
        DayStart = TimeSpan.FromHours(8),
        DayEnd = TimeSpan.FromHours(21),
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
        DayAssignments = assignments ?? new Dictionary<string, int>(StringComparer.Ordinal),
    };

    private static readonly City TehranCity =
        new("tehran", "تهران", "تهران", TestData.Tehran, 1.3m, 3, Climate.Plain);

    private static readonly City IsfahanCity =
        new("isfahan", "اصفهان", "اصفهان", TestData.Isfahan, 1.0m, 3, Climate.Plain);

    private static List<PointOfInterest> Route() =>
    [
        TestData.Poi("a", visitMinutes: 90),
        TestData.Poi("b", visitMinutes: 90),
        TestData.Poi("c", visitMinutes: 90, location: TestData.Isfahan, cityId: "isfahan"),
    ];

    private static DayScheduler Scheduler() => new(new TravelPlanner(NoRoadDistanceProvider.Instance));

    private static int? DayOf(ScheduleResult result, string poiId) =>
        result.Days.FirstOrDefault(d => d.VisitedPoiIds.Contains(poiId))?.Index;

    [Fact]
    public void WithoutAssignments_TheRouteOrderIsKept()
    {
        var result = Scheduler().Schedule(Route(), Request());

        Assert.Equal(1, DayOf(result, "a"));
    }

    /// <summary>جاذبهٔ سنجاق‌شده باید در همان روز بنشیند، نه زودتر.</summary>
    [Fact]
    public void AssignedPoi_LandsOnTheChosenDay()
    {
        var assignments = new Dictionary<string, int>(StringComparer.Ordinal) { ["a"] = 2 };

        var result = Scheduler().Schedule(Route(), Request(assignments));

        Assert.Equal(2, DayOf(result, "a"));
    }

    /// <summary>سنجاق‌کردن یکی نباید بقیه را از برنامه بیرون بیندازد.</summary>
    [Fact]
    public void AssigningOne_DoesNotDropTheOthers()
    {
        var assignments = new Dictionary<string, int>(StringComparer.Ordinal) { ["a"] = 3 };

        var result = Scheduler().Schedule(Route(), Request(assignments));

        Assert.NotNull(DayOf(result, "b"));
        Assert.Equal(3, DayOf(result, "a"));
    }

    /// <summary>
    /// روزی که وجود ندارد، جاذبه را ناپدید نمی‌کند — در فهرست «جا نشد» گزارش
    /// می‌شود. ناپدیدشدن بی‌صدا بدترین حالت است.
    /// </summary>
    [Fact]
    public void AssignmentToANonExistentDay_IsReportedNotSwallowed()
    {
        var assignments = new Dictionary<string, int>(StringComparer.Ordinal) { ["a"] = 9 };

        var result = Scheduler().Schedule(Route(), Request(assignments));

        Assert.Null(DayOf(result, "a"));
        Assert.Contains("a", result.UnscheduledPoiIds);
    }
}

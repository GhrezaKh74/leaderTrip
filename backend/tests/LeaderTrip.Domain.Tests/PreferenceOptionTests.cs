using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

/// <summary>ترجیحات روز: تحویل اقامتگاه، ریتم، استراحت ظهر، شبِ بی‌برنامه و ناهار همراه.</summary>
public sealed class PreferenceOptionTests
{
    private static readonly City TehranCity =
        new("tehran", "تهران", "تهران", TestData.Tehran, 1.3m, 3, Climate.Plain);

    private static readonly City IsfahanCity =
        new("isfahan", "اصفهان", "اصفهان", TestData.Isfahan, 1.0m, 3, Climate.Plain);

    private static DayScheduler Scheduler() => new(new TravelPlanner(NoRoadDistanceProvider.Instance));

    private static ScheduleRequest Request(
        bool checkInFirst = false,
        bool middayRest = false,
        bool eveningProgram = true,
        int? maxVisitsPerDay = null,
        bool picnicLunch = false,
        TimeSpan? firstDayStart = null,
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
        DailyDrivingCap = TimeSpan.FromHours(7),
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
        CheckInFirst = checkInFirst,
        MiddayRest = middayRest,
        EveningProgram = eveningProgram,
        MaxVisitsPerDay = maxVisitsPerDay,
        PicnicLunch = picnicLunch,
        FirstDayStart = firstDayStart,
    };

    private static List<PointOfInterest> IsfahanSights(int count) =>
        [.. Enumerable.Range(1, count).Select(i =>
            TestData.Poi($"sight-{i}", cityId: "isfahan", location: TestData.Isfahan, visitMinutes: 60))];

    /// <summary>با «اول تحویل اقامتگاه»، پیش از نخستین بازدیدِ شهرِ خواب، بلوک تحویل هست.</summary>
    [Fact]
    public void CheckInFirst_AddsCheckInBlock_BeforeFirstStayCityVisit()
    {
        var result = Scheduler().Schedule(IsfahanSights(3), Request(checkInFirst: true));
        var blocks = result.Days[0].Blocks.ToList();

        int checkIn = blocks.FindIndex(b =>
            b.Kind == BlockKind.Rest && b.Title.Contains("تحویل اقامتگاه", StringComparison.Ordinal));
        int firstVisit = blocks.FindIndex(b => b.Kind == BlockKind.Visit);

        Assert.True(checkIn >= 0, "بلوک تحویل اقامتگاه نیست");
        Assert.True(firstVisit < 0 || checkIn < firstVisit, "تحویل اقامتگاه باید پیش از گشتِ شهر باشد");
    }

    /// <summary>بدون این ترجیح، هیچ بلوک تحویلی در برنامه نمی‌نشیند.</summary>
    [Fact]
    public void WithoutCheckInFirst_NoCheckInBlock()
    {
        var result = Scheduler().Schedule(IsfahanSights(3), Request());

        Assert.DoesNotContain(
            result.Days.SelectMany(d => d.Blocks),
            b => b.Title.Contains("تحویل اقامتگاه", StringComparison.Ordinal));
    }

    /// <summary>ریتم آرام یعنی سقف بازدید روزانه — نه بیشتر.</summary>
    [Fact]
    public void MaxVisitsPerDay_CapsEachDay()
    {
        var result = Scheduler().Schedule(IsfahanSights(8), Request(maxVisitsPerDay: 3));

        Assert.All(result.Days, day =>
            Assert.True(day.VisitedPoiIds.Count <= 3, $"روز {day.Index} بیش از سقف بازدید دارد"));
    }

    /// <summary>بعد از ناهار، استراحت می‌نشیند.</summary>
    [Fact]
    public void MiddayRest_FollowsLunch()
    {
        var result = Scheduler().Schedule(IsfahanSights(4), Request(middayRest: true));

        var blocks = result.Days[0].Blocks.ToList();
        int lunch = blocks.FindIndex(b => b.Kind == BlockKind.Meal && b.Title.StartsWith("ناهار", StringComparison.Ordinal));

        Assert.True(lunch >= 0, "ناهار در برنامه نیست");
        Assert.True(
            lunch + 1 < blocks.Count && blocks[lunch + 1].Title == "استراحت بعد از ناهار",
            "بعد از ناهار باید استراحت باشد");
    }

    /// <summary>شبِ بی‌برنامه: با کلید خاموش، بعد از شام هیچ بازدیدی نیست.</summary>
    [Fact]
    public void EveningProgramOff_NoStrollAfterDinner()
    {
        var bazaar = TestData.Poi(
            "bazaar", cityId: "isfahan", location: TestData.Isfahan, nightSuitable: true);

        var result = Scheduler().Schedule(
            IsfahanSights(2),
            Request(eveningProgram: false, dayEndHour: 23, nightPois: [bazaar]));

        Assert.DoesNotContain(
            result.Days.SelectMany(d => d.Blocks),
            b => b.PoiId == "bazaar");
    }

    /// <summary>ناهار همراه: توقف کوتاه و برچسب صادق.</summary>
    [Fact]
    public void PicnicLunch_IsShort()
    {
        var result = Scheduler().Schedule(IsfahanSights(4), Request(picnicLunch: true));

        var lunch = result.Days
            .SelectMany(d => d.Blocks)
            .First(b => b.Kind == BlockKind.Meal && b.Title.StartsWith("ناهار", StringComparison.Ordinal));

        Assert.Equal("ناهار (همراه)", lunch.Title);
        Assert.Equal(TimeSpan.FromMinutes(30), lunch.Duration);
    }

    /// <summary>حرکتِ دیرترِ روز اول فقط روز اول را عقب می‌برد.</summary>
    [Fact]
    public void FirstDayStart_ShiftsOnlyDayOne()
    {
        var result = Scheduler().Schedule(
            IsfahanSights(4), Request(firstDayStart: TimeSpan.FromHours(11)));

        Assert.True(
            result.Days[0].Blocks[0].StartsAt >= TimeSpan.FromHours(11),
            "روز اول باید از ساعت تعیین‌شده شروع شود");
        Assert.Equal(TimeSpan.FromHours(8), result.Days[1].Blocks[0].StartsAt);
    }
}

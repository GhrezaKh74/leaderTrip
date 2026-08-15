using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Scoring;

/// <summary>هر چیزی که قاعده‌های امتیازدهی برای قضاوت لازم دارند.</summary>
public sealed record ScoringContext
{
    public required TravelGroup Group { get; init; }

    public required Coordinate Origin { get; init; }

    public required Distance SearchRadius { get; init; }

    public required int Month { get; init; }

    public required int TripDays { get; init; }

    public required IReadOnlySet<PoiCategory> Interests { get; init; }

    public required IReadOnlySet<string> PinnedPoiIds { get; init; }

    /// <summary>بودجهٔ هر نفر در هر روز — مبنای سنجش گران بودن بلیت.</summary>
    public required Money PerPersonDailyBudget { get; init; }

    /// <summary>خلاصهٔ جوّی سفر؛ اگر داده‌ای نباشد <see langword="null"/>.</summary>
    public WeatherOutlook? Weather { get; init; }

    /// <summary>سلیقهٔ آموخته‌شده از امتیازهای سفرهای گذشته، ‎−۱ تا ۱.</summary>
    public IReadOnlyDictionary<PoiCategory, double> LearnedTaste { get; init; }
        = new Dictionary<PoiCategory, double>();
}

/// <summary>خلاصهٔ آب‌وهوای سفر — نه پیش‌بینی روزبه‌روز، بلکه آنچه بر انتخاب اثر دارد.</summary>
public sealed record WeatherOutlook
{
    public required double AverageMaxTemperature { get; init; }

    public required double AveragePrecipitationProbability { get; init; }

    public required bool HasSnow { get; init; }
}

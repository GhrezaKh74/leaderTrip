using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Planning;

/// <summary>نوع یک بلوک در برنامهٔ روز.</summary>
public enum BlockKind { Drive, Visit, Meal, Rest, Lodging, Refuel }

/// <summary>یک بازهٔ زمانی در برنامهٔ یک روز.</summary>
public sealed record PlanBlock
{
    public required BlockKind Kind { get; init; }

    /// <summary>زمان شروع، از نیمه‌شب.</summary>
    public required TimeSpan StartsAt { get; init; }

    public required TimeSpan Duration { get; init; }

    public required string Title { get; init; }

    public required Money Cost { get; init; }

    public string? PoiId { get; init; }

    public Distance? DistanceCovered { get; init; }

    public string? Note { get; init; }
}

/// <summary>برنامهٔ یک روز.</summary>
public sealed record DayPlan
{
    public required int Index { get; init; }

    public required DateOnly Date { get; init; }

    /// <summary>شهری که شب در آن می‌مانیم، یا روز در آن تمام می‌شود.</summary>
    public required string BaseCityId { get; init; }

    public required IReadOnlyList<PlanBlock> Blocks { get; init; }

    public required Distance Distance { get; init; }

    public required TimeSpan DrivingTime { get; init; }

    public required Money Cost { get; init; }

    public IReadOnlyList<string> VisitedPoiIds =>
        Blocks.Where(b => b.Kind == BlockKind.Visit && b.PoiId is not null)
              .Select(b => b.PoiId!)
              .ToList();
}

/// <summary>برنامهٔ کامل سفر.</summary>
public sealed record TripPlan
{
    public required IReadOnlyList<DayPlan> Days { get; init; }

    public required CostBreakdown Cost { get; init; }

    public required Distance TotalDistance { get; init; }

    public required TimeSpan TotalDrivingTime { get; init; }

    public required int VisitCount { get; init; }

    /// <summary>جاذبه‌هایی که شرایط را داشتند ولی در زمان‌بندی جا نشدند.</summary>
    public required IReadOnlyList<string> UnscheduledPoiIds { get; init; }

    /// <summary>دلیل رد شدن هر جاذبه‌ای که قیدی را نقض کرده.</summary>
    public required IReadOnlyDictionary<string, string> RejectionReasons { get; init; }

    /// <summary>منبع مسافت‌ها — کاربر باید بداند عدد اندازه‌گیری است یا تخمین.</summary>
    public required DistanceSource DistanceSource { get; init; }
}

/// <summary>یک جاذبه به‌همراه امتیازش برای این سفر.</summary>
public sealed record ScoredPoi(PointOfInterest Poi, double Score);

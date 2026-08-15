using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Routing;

namespace LeaderTrip.Application.Trips.GeneratePlan;

/// <summary>برنامهٔ ساخته‌شده، به شکلی که برای انتقال روی شبکه مناسب است.</summary>
public sealed record TripPlanResponse
{
    public required IReadOnlyList<DayPlanDto> Days { get; init; }

    public required CostBreakdownDto Cost { get; init; }

    public required double TotalKilometers { get; init; }

    public required double TotalDrivingMinutes { get; init; }

    public required int VisitCount { get; init; }

    public required IReadOnlyList<string> UnscheduledPoiIds { get; init; }

    /// <summary>«Routed» یعنی مسیر واقعی جاده، «Estimated» یعنی تخمین ضریب پیچش.</summary>
    public required DistanceSource DistanceSource { get; init; }

    /// <summary>هشدارهای لیدر — همان چیزی که «فهرست جاها» را به «دستیار» تبدیل می‌کند.</summary>
    public required IReadOnlyList<AdviceDto> Advice { get; init; }

    public required IReadOnlyList<PackingItemDto> Packing { get; init; }
}

public sealed record DayPlanDto(
    int Index,
    DateOnly Date,
    string BaseCityId,
    IReadOnlyList<PlanBlockDto> Blocks,
    double Kilometers,
    double DrivingMinutes,
    decimal Cost);

public sealed record PlanBlockDto(
    BlockKind Kind,
    string StartsAt,
    double DurationMinutes,
    string Title,
    decimal Cost,
    string? PoiId,
    double? Kilometers,
    string? Note);

public sealed record CostBreakdownDto(
    IReadOnlyList<CostLineDto> Lines,
    decimal Subtotal,
    decimal Miscellaneous,
    decimal RiskBuffer,
    decimal Total,
    decimal PerPerson,
    decimal Optimistic,
    decimal Pessimistic,
    decimal OverBudget);

public sealed record CostLineDto(string Key, string Label, decimal Amount, string Formula);

/// <param name="Code">شناسهٔ ماشین‌خوان — رابط کاربری روی این شرط می‌گذارد، نه روی متن.</param>
/// <param name="Level">شدت: <c>Info</c>، <c>Warning</c> یا <c>Critical</c>.</param>
/// <param name="Title">عنوان کوتاه.</param>
/// <param name="Detail">توضیح و راه‌حل پیشنهادی.</param>
public sealed record AdviceDto(string Code, string Level, string Title, string Detail);

public sealed record PackingItemDto(string Group, string Item, string Reason);

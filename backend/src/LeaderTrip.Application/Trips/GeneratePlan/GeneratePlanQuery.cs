using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Application.Trips.GeneratePlan;

/// <summary>درخواست ساخت یک برنامهٔ سفر.</summary>
public sealed record GeneratePlanQuery : IQuery<TripPlanResponse>
{
    public required string OriginCityId { get; init; }

    public required DateOnly StartDate { get; init; }

    public required int Days { get; init; }

    public required double RadiusKm { get; init; }

    public required string VehicleId { get; init; }

    public required IReadOnlyList<TravelerDto> Travelers { get; init; }

    public required decimal BudgetToman { get; init; }

    public TravelStyle Style { get; init; } = TravelStyle.Balanced;

    public LodgingKind Lodging { get; init; } = LodgingKind.Hotel;

    public IReadOnlyList<PoiCategory> Interests { get; init; } = [];

    public double MaxDrivingHoursPerDay { get; init; } = 5;

    public int DayStartHour { get; init; } = 8;

    public int DayEndHour { get; init; } = 21;

    public bool RoundTrip { get; init; } = true;

    public int VehicleCount { get; init; } = 1;

    public decimal SubsidizedFuelShare { get; init; } = 0.6m;

    public IReadOnlyList<string> PinnedPoiIds { get; init; } = [];

    public IReadOnlyList<string> ExcludedPoiIds { get; init; } = [];

    /// <summary>
    /// سلیقهٔ آموخته‌شده از امتیازهای سفرهای گذشته، ‎−۱ تا ۱ برای هر دسته.
    /// </summary>
    /// <remarks>
    /// کلاینت آن را از امتیازهای ذخیره‌شده روی همان دستگاه می‌سازد و می‌فرستد.
    /// نگه‌داشتنش سمت سرور یعنی حساب کاربری، و حساب کاربری یعنی دادهٔ شخصی —
    /// بهایی که این ویژگی به تنهایی توجیهش نمی‌کند.
    /// </remarks>
    public IReadOnlyDictionary<PoiCategory, double> LearnedTaste { get; init; } =
        new Dictionary<PoiCategory, double>();
}

public sealed record TravelerDto(string Id, string Name, int Age, MobilityLevel Mobility, bool IsDriver);

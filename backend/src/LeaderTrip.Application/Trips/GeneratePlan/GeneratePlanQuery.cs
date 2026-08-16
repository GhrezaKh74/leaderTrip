using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Application.Trips.GeneratePlan;

/// <summary>درخواست ساخت یک برنامهٔ سفر.</summary>
public sealed record GeneratePlanQuery : IQuery<TripPlanResponse>
{
    public required string OriginCityId { get; init; }

    /// <summary>
    /// مقصد سفر — اختیاری. خالی یعنی سفر حلقه‌ای دور مبدأ (رفتار همیشگی)؛
    /// پرشده، معنایش را <see cref="DestinationMode"/> تعیین می‌کند.
    /// </summary>
    public string? DestinationCityId { get; init; }

    /// <summary>
    /// هدف از مقصد: «اقامت» (پیش‌فرض — مقصد پایگاه است، جاذبه‌ها دور مقصد و
    /// سرِ راه، و <see cref="RoundTrip"/> یعنی روز آخر برگشت به مبدأ) یا
    /// «مسیرگردی» (خودِ راه هدف است؛ یک‌سویه، روز آخر رسیدن به مقصد).
    /// </summary>
    public DestinationMode DestinationMode { get; init; } = DestinationMode.Stay;

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

    /// <summary>
    /// جاذبه‌هایی که کاربر دستی به روز مشخصی برده است (شمارهٔ روز از ۱).
    /// </summary>
    /// <remarks>
    /// ویرایش دستی این‌جا ثبت می‌شود، نه در خروجی. اگر خروجی مستقیم دستکاری
    /// می‌شد، مسافت و ساعت و هزینه با آنچه روی صفحه است نمی‌خواند — و کل ادعای
    /// «قابل ردیابی تا آخرین ریال» از بین می‌رفت.
    /// </remarks>
    public IReadOnlyDictionary<string, int> DayAssignments { get; init; } =
        new Dictionary<string, int>(StringComparer.Ordinal);
}

public sealed record TravelerDto(string Id, string Name, int Age, MobilityLevel Mobility, bool IsDriver);

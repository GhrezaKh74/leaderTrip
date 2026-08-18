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
    /// هدف از مقصد: «ترکیبی» (پیش‌فرض — اقامت دور مقصد + گشتِ سرِ راه)،
    /// «اقامت» (فقط دور مقصد؛ راه فقط راه است) یا «مسیرگردی» (خودِ راه هدف
    /// است؛ یک‌سویه، روز آخر رسیدن به مقصد). در دو حالت اول
    /// <see cref="RoundTrip"/> یعنی روز آخر برگشت به مبدأ.
    /// </summary>
    public DestinationMode DestinationMode { get; init; } = DestinationMode.Mixed;

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

    // ─── ترجیحات روز — سلیقه‌های واقعی سفر که پیش‌فرضشان رفتار همیشگی است ───

    /// <summary>اول تحویل اقامتگاه و کمی استراحت، بعد گشتِ شهرِ اقامت.</summary>
    public bool CheckInFirst { get; init; }

    /// <summary>استراحت کوتاه بعد از هر ناهار (قیلوله).</summary>
    public bool MiddayRest { get; init; }

    /// <summary>برنامهٔ شب: گشت بعد از شام و بازدیدهای آخر شب. خاموش یعنی شبْ استراحت است.</summary>
    public bool EveningProgram { get; init; } = true;

    /// <summary>ریتم بازدید روزانه — سقف توقف‌های هر روز.</summary>
    public DayPace DayPace { get; init; } = DayPace.Packed;

    /// <summary>ناهار رستوران بین‌راهی یا همراه‌بردن.</summary>
    public LunchStyle LunchStyle { get; init; } = LunchStyle.Restaurant;

    /// <summary>
    /// ساعت حرکت روز اول اگر با بقیهٔ روزها فرق دارد — جمع‌کردن وسایل و تحویل
    /// خانه، صبحِ روز اول را دیرتر می‌کند. <see langword="null"/> یعنی مثل بقیه.
    /// </summary>
    public int? FirstDayStartHour { get; init; }

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

    /// <summary>
    /// توقف‌های دلخواه کاربر — جاهایی که در دیتاست ما نیستند و کاربر خودش روی
    /// نقشه انتخابشان کرده است.
    /// </summary>
    /// <remarks>
    /// مثل سنجاق‌شده‌ها رفتار می‌کنند: حتماً در برنامه می‌آیند و زمان‌بند دورشان
    /// می‌چیند. دادهٔ غنی (سختی، بلیت، ساعت کار) ندارند — کاربر خودش خواسته،
    /// پس پیش‌فرض‌های خنثی می‌گیرند.
    /// </remarks>
    public IReadOnlyList<CustomStopDto> CustomStops { get; init; } = [];
}

public sealed record TravelerDto(string Id, string Name, int Age, MobilityLevel Mobility, bool IsDriver);

/// <param name="Id">شناسهٔ سمت کلاینت — با پیشوند «custom-» تا با دیتاست تداخل نکند.</param>
/// <param name="Name">عنوانی که کاربر انتخاب کرده.</param>
/// <param name="Lat">عرض جغرافیایی.</param>
/// <param name="Lng">طول جغرافیایی.</param>
/// <param name="VisitMinutes">مدت بازدید به دقیقه — انتخاب خود کاربر.</param>
public sealed record CustomStopDto(string Id, string Name, double Lat, double Lng, int VisitMinutes = 60);

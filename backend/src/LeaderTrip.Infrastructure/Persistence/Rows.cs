using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Infrastructure.Persistence;

/// <summary>مدل ماندگارسازی — شکل داده روی دیسک، چه در JSON چه در جدول.</summary>
/// <remarks>
/// <para>
/// این‌ها عمداً از موجودیت‌های دامنه جدا هستند و دو دلیل دارد.
/// </para>
/// <para>
/// <b>یکم، قاعده.</b> موجودیت دامنه بی‌قاعده ساخته نمی‌شود: مختصات نامعتبر اصلاً
/// به وجود نمی‌آید و مبلغ منفی رد می‌شود. یکی‌کردنش با ردیف پایگاه داده یعنی یا
/// دامنه را سست کنیم تا هر ردیفی در آن بنشیند، یا خواندن را شکننده کنیم.
/// </para>
/// <para>
/// <b>دوم، هزینهٔ واقعی.</b> EF Core نمی‌تواند شیء مقدار (<c>ComplexProperty</c>)
/// را به پارامتر سازنده ببندد. راه دیگر این بود که به موجودیت‌های دامنه سازندهٔ
/// خصوصیِ بی‌پارامتر و ستر خصوصی اضافه کنیم — یعنی امتیازی که دامنه فقط به‌خاطر
/// ابزار ماندگارسازی می‌دهد. این‌طوری دامنه دست‌نخورده می‌ماند و بهایش یک نگاشت
/// چند خطی است که یک‌بار نوشته می‌شود.
/// </para>
/// </remarks>
public sealed record CityRow(
    string Id,
    string Name,
    string Province,
    double Lat,
    double Lng,
    decimal CostIndex,
    int Amenities,
    Climate Climate);

public sealed record PoiRow(
    string Id,
    string Name,
    string CityId,
    double Lat,
    double Lng,
    PoiCategory Category,
    double Rating,
    int VisitMinutes,
    decimal Ticket,
    IReadOnlyList<int> BestMonths,
    bool Indoor,
    Difficulty Difficulty,
    int MinAge,
    bool KidFriendly,
    bool SeniorFriendly,
    OffroadCapability RequiredVehicle,
    bool NightSuitable,
    IReadOnlyList<string> Tags,
    string Description,
    /* «HH:mm»؛ null یعنی پیش‌فرض دسته، و «00:00/00:00» یعنی شبانه‌روزی. */
    string? OpensAt = null,
    string? ClosesAt = null);

public sealed record VehicleRow(
    string Id,
    string Label,
    VehicleClass Class,
    FuelKind Fuel,
    double ConsumptionPer100Km,
    int Seats,
    OffroadCapability Offroad,
    double SpeedFactor,
    decimal DepreciationPerKm,
    decimal TollFactor);

public sealed record MealPricesRow(decimal Breakfast, decimal Lunch, decimal Dinner);

/// <summary>محتوای دفترچهٔ قیمت — درون ستون <c>jsonb</c> ذخیره می‌شود، نه در جدول جدا.</summary>
public sealed record PriceBookContent(
    IReadOnlyDictionary<FuelKind, decimal> SubsidizedFuel,
    IReadOnlyDictionary<FuelKind, decimal> FreeMarketFuel,
    decimal TollPerKilometer,
    decimal FreewayShare,
    IReadOnlyDictionary<TravelStyle, decimal> LodgingPerNight,
    IReadOnlyDictionary<TravelStyle, MealPricesRow> Meals,
    decimal SnackRate,
    IReadOnlyDictionary<TravelStyle, decimal> MiscRate,
    IReadOnlyDictionary<TravelStyle, decimal> BufferRate,
    string UpdatedAt);

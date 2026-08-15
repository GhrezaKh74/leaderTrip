using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Application.Reference.GetReferenceData;

/// <summary>هرچه ویزارد برای پرکردن فرم لازم دارد، در یک درخواست.</summary>
/// <remarks>
/// شهرها، خودروها و قیمت‌ها با هم برگردانده می‌شوند چون با هم لازم‌اند: ویزارد
/// بدون هر سهٔ آن‌ها قابل نمایش نیست. سه اندپوینت جدا یعنی سه رفت‌وبرگشت شبکه
/// برای رسیدن به همان صفحه — و سه فرصت برای اینکه یکی‌شان شکست بخورد و صفحه
/// نیمه‌کاره بماند.
/// </remarks>
public sealed record GetReferenceDataQuery : IQuery<ReferenceDataResponse>;

public sealed record ReferenceDataResponse(
    IReadOnlyList<CityDto> Cities,
    IReadOnlyList<VehicleDto> Vehicles,
    PriceBookDto Prices);

public sealed record CityDto(
    string Id,
    string Name,
    string Province,
    double Lat,
    double Lng,
    decimal CostIndex,
    int Amenities,
    Climate Climate,
    bool CanStayOvernight);

public sealed record VehicleDto(
    string Id,
    string Label,
    VehicleClass Class,
    FuelKind Fuel,
    double ConsumptionPer100Km,
    int Seats,
    OffroadCapability Offroad,
    decimal DepreciationPerKm);

/// <summary>
/// قیمت‌ها همان‌طور که کاربر می‌بیند و می‌تواند ویرایش کند.
/// </summary>
/// <remarks>
/// <c>UpdatedAt</c> عمداً در پاسخ هست: عددی که ممکن است شش ماه قدیمی باشد باید
/// تاریخش را همراه خودش ببرد، وگرنه کاربر تخمین کهنه را تخمین امروز می‌فهمد.
/// </remarks>
public sealed record PriceBookDto(
    IReadOnlyDictionary<string, decimal> SubsidizedFuel,
    IReadOnlyDictionary<string, decimal> FreeMarketFuel,
    decimal TollPerKilometer,
    decimal FreewayShare,
    IReadOnlyDictionary<string, decimal> LodgingPerNight,
    IReadOnlyDictionary<string, MealPricesDto> Meals,
    decimal SnackRate,
    IReadOnlyDictionary<string, decimal> MiscRate,
    IReadOnlyDictionary<string, decimal> BufferRate,
    string UpdatedAt);

public sealed record MealPricesDto(decimal Breakfast, decimal Lunch, decimal Dinner);

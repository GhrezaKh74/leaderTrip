using System.Collections.Frozen;
using System.Globalization;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Infrastructure.Persistence;

/// <summary>تبدیل ردیف ماندگارشده به موجودیت دامنه.</summary>
/// <remarks>
/// تنها جایی است که این نگاشت نوشته شده؛ فایل JSON همراه برنامه و جدول پایگاه
/// داده هر دو از همین راه رد می‌شوند. دو نسخهٔ جدا از این نگاشت یعنی دو تعریف از
/// «جاذبه» که دیر یا زود سر یک فیلد از هم دور می‌شوند.
/// </remarks>
internal static class RowMapper
{
    public static City ToDomain(CityRow row) => new(
        row.Id,
        row.Name,
        row.Province,
        Point(row.Lat, row.Lng, row.Id),
        row.CostIndex,
        row.Amenities,
        row.Climate);

    public static PointOfInterest ToDomain(PoiRow row) => new(
        row.Id,
        row.Name,
        row.CityId,
        Point(row.Lat, row.Lng, row.Id),
        row.Category,
        row.Rating,
        TimeSpan.FromMinutes(row.VisitMinutes),
        Money.FromToman(row.Ticket),
        row.BestMonths.ToFrozenSet(),
        row.Indoor,
        row.Difficulty,
        row.MinAge,
        row.KidFriendly,
        row.SeniorFriendly,
        row.RequiredVehicle,
        row.Description,
        row.NightSuitable,
        row.Tags);

    public static Vehicle ToDomain(VehicleRow row) => new(
        row.Id,
        row.Label,
        row.Class,
        row.Fuel,
        row.ConsumptionPer100Km,
        row.Seats,
        row.Offroad,
        row.SpeedFactor,
        row.DepreciationPerKm,
        row.TollFactor);

    public static PriceBook ToDomain(PriceBookContent content) => new()
    {
        SubsidizedFuel = ToMoneyMap(content.SubsidizedFuel),
        FreeMarketFuel = ToMoneyMap(content.FreeMarketFuel),
        TollPerKilometer = Money.FromToman(content.TollPerKilometer),
        FreewayShare = content.FreewayShare,
        LodgingPerNight = ToMoneyMap(content.LodgingPerNight),
        Meals = content.Meals.ToFrozenDictionary(
            kv => kv.Key,
            kv => new MealPrices(
                Money.FromToman(kv.Value.Breakfast),
                Money.FromToman(kv.Value.Lunch),
                Money.FromToman(kv.Value.Dinner))),
        SnackRate = content.SnackRate,
        MiscRate = content.MiscRate.ToFrozenDictionary(),
        BufferRate = content.BufferRate.ToFrozenDictionary(),
        UpdatedAt = content.UpdatedAt,
    };

    /// <summary>
    /// مختصات در دادهٔ مرجع هرگز نباید نامعتبر باشد؛ اگر بود، دادهٔ خراب است نه
    /// ورودی کاربر — پس این‌جا استثنا درست است، نه <c>Result</c>. عبور دادن یک
    /// جاذبه با مختصات بی‌معنا بدتر از بالا نیامدن برنامه است.
    /// </summary>
    private static Coordinate Point(double latitude, double longitude, string id) =>
        Coordinate.Create(latitude, longitude).Match(
            onSuccess: coordinate => coordinate,
            onFailure: error => throw new InvalidOperationException(
                string.Create(CultureInfo.InvariantCulture, $"مختصات نامعتبر در «{id}»: {error.Message}")));

    private static FrozenDictionary<TKey, Money> ToMoneyMap<TKey>(IReadOnlyDictionary<TKey, decimal> source)
        where TKey : notnull =>
        source.ToFrozenDictionary(kv => kv.Key, kv => Money.FromToman(kv.Value));
}

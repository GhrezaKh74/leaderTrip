using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Pricing;

/// <summary>قیمت‌های پایه — همه به تومان.</summary>
/// <remarks>
/// این‌ها پیکربندی‌اند، نه ثابتِ کامپایل‌شده. در ایران قیمت‌ها سریع عوض می‌شوند
/// و مهم‌ترین دلیل داشتن بک‌اند همین است: به‌روزرسانی قیمت بدون انتشار نسخهٔ جدید.
/// </remarks>
public sealed record PriceBook
{
    public required IReadOnlyDictionary<FuelKind, Money> SubsidizedFuel { get; init; }

    public required IReadOnlyDictionary<FuelKind, Money> FreeMarketFuel { get; init; }

    /// <summary>تومان بر کیلومتر، برای سواری.</summary>
    public required Money TollPerKilometer { get; init; }

    /// <summary>سهم آزادراه از مسیر برون‌شهری، ۰ تا ۱.</summary>
    public required decimal FreewayShare { get; init; }

    /// <summary>تومان، هر نفر هر شب.</summary>
    public required IReadOnlyDictionary<TravelStyle, Money> LodgingPerNight { get; init; }

    public required IReadOnlyDictionary<TravelStyle, MealPrices> Meals { get; init; }

    /// <summary>نرخ تنقلات بین‌راهی روی جمع خوراک.</summary>
    public required decimal SnackRate { get; init; }

    public required IReadOnlyDictionary<TravelStyle, decimal> MiscRate { get; init; }

    public required IReadOnlyDictionary<TravelStyle, decimal> BufferRate { get; init; }

    /// <summary>تاریخ آخرین به‌روزرسانی — در رابط کاربری نمایش داده می‌شود.</summary>
    public required string UpdatedAt { get; init; }
}

/// <summary>قیمت وعده‌های غذایی برای یک سطح سفر.</summary>
public readonly record struct MealPrices(Money Breakfast, Money Lunch, Money Dinner);

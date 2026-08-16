using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Pricing;

/// <summary>هر چیزی که اجزای هزینه برای محاسبه لازم دارند.</summary>
public sealed record CostContext
{
    public required TravelGroup Group { get; init; }

    public required Vehicle Vehicle { get; init; }

    public required PriceBook Prices { get; init; }

    public required TravelStyle Style { get; init; }

    public required LodgingKind Lodging { get; init; }

    public required Distance TotalDistance { get; init; }

    /// <summary>سهم مسیر کوهستانی از کل، ۰ تا ۱ — مصرف سوخت را بالا می‌برد.</summary>
    public required double MountainShare { get; init; }

    public required int VehicleCount { get; init; }

    /// <summary>سهم سوختی که با نرخ سهمیه‌ای تأمین می‌شود، ۰ تا ۱.</summary>
    public required decimal SubsidizedFuelShare { get; init; }

    /// <summary>شهر اقامت هر شب — طولش برابر تعداد شب‌هاست.</summary>
    public required IReadOnlyList<City> NightCities { get; init; }

    public required IReadOnlyList<PointOfInterest> VisitedPois { get; init; }

    public required int Days { get; init; }

    /// <summary>ناهار همراه‌بردنی است — از خانه، نه رستوران بین‌راهی.</summary>
    public bool PicnicLunch { get; init; }

    /// <summary>ماه میلادی شروع سفر — بر ضریب فصلی اقامت اثر دارد.</summary>
    public required int Month { get; init; }

    public int Nights => NightCities.Count;
}

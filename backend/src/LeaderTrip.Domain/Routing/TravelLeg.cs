using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Routing;

/// <summary>یک مرحلهٔ حرکت بین دو نقطه.</summary>
/// <param name="Road">مسافت جاده‌ای.</param>
/// <param name="Duration">زمان رانندگی، پس از اعمال ضریب خودرو و گروه.</param>
/// <param name="Terrain">نوع زمین — بر مصرف سوخت اثر دارد.</param>
/// <param name="Source">مسافت از کجا آمده. عددی که حدس است نباید شبیه اندازه‌گیری باشد.</param>
public readonly record struct TravelLeg(
    Distance Road,
    TimeSpan Duration,
    Terrain Terrain,
    DistanceSource Source);

/// <summary>منبع یک مسافت.</summary>
public enum DistanceSource
{
    /// <summary>فاصلهٔ هوایی × ضریب پیچش جاده — خطای حدود ±۱۵٪.</summary>
    Estimated,

    /// <summary>مسیر واقعی جاده از سرویس مسیریابی.</summary>
    Routed,
}

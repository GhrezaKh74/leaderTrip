namespace LeaderTrip.Domain.Enums;

/// <summary>دستهٔ جاذبه.</summary>
public enum PoiCategory
{
    Historical, Nature, Religious, Museum, Adventure, Food, Shopping,
    Entertainment, Village, Beach, Desert, Mountain, Lake, Waterfall, Cave, Garden,
}

/// <summary>سختی دسترسی و پیاده‌روی یک جاذبه.</summary>
public enum Difficulty
{
    /// <summary>بدون پیاده‌روی.</summary>
    None = 0,

    /// <summary>پیاده‌روی سبک.</summary>
    Light = 1,

    /// <summary>پیاده‌روی سنگین.</summary>
    Heavy = 2,

    /// <summary>کوهنوردی.</summary>
    Climbing = 3,
}

/// <summary>حداقل توان عبور از جادهٔ غیرآسفالت.</summary>
public enum OffroadCapability
{
    Paved = 0,
    LightDirt = 1,
    FullOffroad = 2,
}

public enum MobilityLevel { Full, Limited, Wheelchair }

public enum TravelStyle { Budget, Balanced, Comfort, Luxury }

public enum LodgingKind { Hotel, EcoLodge, Villa, Camp, Friends }

public enum FuelKind { Gasoline, Diesel, Cng, Electric }

public enum VehicleClass { Sedan, Suv, Van, Minibus, Bus, Motorcycle, Ev }

/// <summary>نوع اقلیم شهر — بر چک‌لیست، ضریب فصل و هشدارها اثر دارد.</summary>
public enum Climate { Desert, Mountain, Caspian, Gulf, Plain, Steppe }

/// <summary>نوع زمین بین دو نقطه — بر ضریب پیچش جاده و سرعت اثر دارد.</summary>
public enum Terrain { Freeway, Plain, Mountain, Dirt }

/// <summary>وقتی مقصد انتخاب شده، هدف از مقصد چیست؟</summary>
/// <remarks>
/// دو الگوی واقعی سفر ایرانی، دو معنای متفاوت از «مقصد»:
/// <b>اقامت</b> یعنی مقصد پایگاه سفر است — رایج‌ترین حالت: برو اصفهان، بمان،
/// بگرد، برگرد. <b>مسیرگردی</b> یعنی خودِ راه هدف است و مقصد فقط نقطهٔ پایان.
/// این تصمیمِ کاربر است، نه حدس موتور — چون هر دو با یک مبدأ و مقصد شروع
/// می‌شوند و برنامهٔ درستشان از زمین تا آسمان فرق دارد.
/// </remarks>
public enum DestinationMode
{
    /// <summary>فقط مقصد: جاذبه‌ها دور مقصد؛ راه، فقط راه است. برگشت معنا دارد.</summary>
    Stay,

    /// <summary>خودِ مسیر هدف است: جاذبه‌ها در راهرو؛ روز آخر رسیدن به مقصد.</summary>
    Corridor,

    /// <summary>ترکیبی: اقامت دور مقصد + گشتِ سرِ راه — پیش‌فرض، چون سفر واقعی همین است.</summary>
    Mixed,
}

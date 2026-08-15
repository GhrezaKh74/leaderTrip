using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Domain.Advice;

/// <param name="Group">دستهٔ فهرست — «مدارک»، «پوشاک»، ….</param>
/// <param name="Item">خود قلم.</param>
/// <param name="Reason">چرا این قلم در فهرست است؛ بدون آن، فهرست عمومی می‌شود.</param>
public sealed record PackingItem(string Group, string Item, string Reason);

/// <summary>ورودی ساخت چک‌لیست.</summary>
public sealed record PackingContext
{
    public required TravelGroup Group { get; init; }

    public required Vehicle Vehicle { get; init; }

    public required LodgingKind Lodging { get; init; }

    public required int Month { get; init; }

    public required IReadOnlyList<Climate> Climates { get; init; }

    public required IReadOnlyList<PointOfInterest> VisitedPois { get; init; }

    public required int Nights { get; init; }
}

/// <summary>چک‌لیست بار، متناسب با همین سفر.</summary>
/// <remarks>
/// <para>
/// چک‌لیست عمومی را همه‌جا می‌شود پیدا کرد و کسی نمی‌خواندش. ارزش این‌جا در
/// ستون «چرا» است: «زنجیر چرخ — چون شب در منطقهٔ کوهستانی و در زمستان
/// می‌مانید» چیزی است که کاربر جدی می‌گیرد.
/// </para>
/// <para>
/// هر قاعده به یک واقعیتِ همین سفر گره خورده است: اقلیم، ماه، ترکیب سنی،
/// نوع اقامت، و سختی جاذبه‌ها.
/// </para>
/// </remarks>
public static class PackingList
{
    public static IReadOnlyList<PackingItem> Build(PackingContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var items = new List<PackingItem>
        {
            new("مدارک", "کارت ملی و گواهی‌نامه", "برای همهٔ بزرگسالان، و کارت خودرو"),
            new("مدارک", "بیمه‌نامهٔ شخص ثالث", "کنترل جاده‌ای معمول است"),
            new("خودرو", "زاپاس سالم، جک و آچار چرخ", "پنچری در جادهٔ خلوت با تاکسی حل نمی‌شود"),
            new("خودرو", "کمک‌های اولیه", "فاصلهٔ تا نزدیک‌ترین درمانگاه می‌تواند زیاد باشد"),
            new("عمومی", "شارژر و پاوربانک", "مسیریابی باتری را سریع خالی می‌کند"),
        };

        AddClimate(context, items);
        AddPeople(context, items);
        AddActivities(context, items);
        AddLodging(context, items);

        return items;
    }

    private static void AddClimate(PackingContext context, List<PackingItem> items)
    {
        bool summer = context.Month is 6 or 7 or 8;
        bool winter = context.Month is 12 or 1 or 2;

        if (context.Climates.Contains(Climate.Desert) || context.Climates.Contains(Climate.Gulf))
        {
            items.Add(new("پوشاک", "کلاه و عینک آفتابی", "مسیر از منطقهٔ آفتابی می‌گذرد"));
            items.Add(new("عمومی", "آب اضافه (هر نفر ۲ لیتر در روز)", "فاصلهٔ پمپ‌بنزین‌ها در کویر زیاد است"));

            if (summer)
            {
                items.Add(new("عمومی", "ضدآفتاب", "گرمای تابستان در این مسیر جدی است"));
            }
        }

        if (context.Climates.Contains(Climate.Mountain))
        {
            items.Add(new("پوشاک", "لباس گرم", "شب‌های کوهستان حتی در تابستان سرد است"));

            if (winter)
            {
                items.Add(new("خودرو", "زنجیر چرخ", "جادهٔ کوهستانی در زمستان ممکن است زنجیر بخواهد"));
            }
        }

        if (context.Climates.Contains(Climate.Caspian))
        {
            items.Add(new("پوشاک", "بارانی و کفش ضدآب", "سواحل خزر در بیشتر فصل‌ها باران دارد"));
            items.Add(new("عمومی", "پشه‌بند یا ضدحشره", "رطوبت شمال یعنی پشه"));
        }
    }

    private static void AddPeople(PackingContext context, List<PackingItem> items)
    {
        var travelers = context.Group.Travelers;

        if (travelers.Any(t => t.Age < 6))
        {
            items.Add(new("همسفران", "خوراکی و بازی کودک", "کودک زیر ۶ سال در مسیر طولانی بی‌حوصله می‌شود"));
            items.Add(new("همسفران", "صندلی کودک", "الزام قانونی و ایمنی"));
        }

        if (travelers.Any(t => t.Age >= 65))
        {
            items.Add(new("همسفران", "داروهای شخصی با نسخه", "تهیهٔ دارو در شهر کوچک ممکن است سخت باشد"));
        }

        if (travelers.Any(t => t.Mobility != MobilityLevel.Full))
        {
            items.Add(new("همسفران", "وسیلهٔ کمک‌حرکتی", "یکی از همسفران محدودیت حرکتی دارد"));
        }
    }

    private static void AddActivities(PackingContext context, List<PackingItem> items)
    {
        if (context.VisitedPois.Any(p => p.Difficulty >= Difficulty.Heavy))
        {
            items.Add(new("پوشاک", "کفش کوهنوردی", "برنامه پیاده‌روی سنگین دارد"));
        }

        if (context.VisitedPois.Any(p => p.Category is PoiCategory.Cave))
        {
            items.Add(new("عمومی", "چراغ‌قوه", "بازدید از غار در برنامه هست"));
        }

        if (context.VisitedPois.Any(p => p.Category is PoiCategory.Beach or PoiCategory.Lake))
        {
            items.Add(new("پوشاک", "حوله و لباس اضافه", "توقف کنار آب در برنامه هست"));
        }

        if (context.VisitedPois.Any(p => p.Category is PoiCategory.Religious))
        {
            items.Add(new("پوشاک", "پوشش مناسب اماکن مذهبی", "بازدید از مکان مذهبی در برنامه هست"));
        }
    }

    private static void AddLodging(PackingContext context, List<PackingItem> items)
    {
        if (context.Nights == 0)
        {
            return;
        }

        switch (context.Lodging)
        {
            case LodgingKind.Camp:
                items.Add(new("اقامت", "چادر، کیسه‌خواب و زیرانداز", "اقامت کمپینگ انتخاب شده"));
                items.Add(new("اقامت", "چراغ و گاز پیک‌نیکی", "در کمپ امکاناتی نیست"));
                break;

            case LodgingKind.EcoLodge:
                items.Add(new("اقامت", "حولهٔ شخصی", "بوم‌گردی‌ها معمولاً حوله نمی‌دهند"));
                break;

            case LodgingKind.Friends:
                items.Add(new("اقامت", "هدیهٔ کوچک میزبان", "اقامت در خانهٔ آشنا"));
                break;

            case LodgingKind.Hotel:
            case LodgingKind.Villa:
            default:
                break;
        }
    }
}

using System.Globalization;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Advice;

/// <summary>شدت یک هشدار.</summary>
public enum AdviceLevel
{
    /// <summary>خوب است بداند.</summary>
    Info,

    /// <summary>باید ببیند.</summary>
    Warning,

    /// <summary>اگر نادیده بگیرد، سفر بد می‌شود.</summary>
    Critical,
}

/// <param name="Code">شناسهٔ ماشین‌خوان — رابط کاربری روی این شرط می‌گذارد، نه روی متن.</param>
/// <param name="Level">شدت.</param>
/// <param name="Title">عنوان کوتاه.</param>
/// <param name="Detail">توضیح، و تا جای ممکن کاری که می‌شود کرد.</param>
public sealed record Advice(string Code, AdviceLevel Level, string Title, string Detail);

/// <summary>ورودی مشاور.</summary>
public sealed record AdviceContext
{
    public required TravelGroup Group { get; init; }

    public required Vehicle Vehicle { get; init; }

    public required IReadOnlyList<DayPlan> Days { get; init; }

    public required IReadOnlyList<PointOfInterest> VisitedPois { get; init; }

    public required CostBreakdown Cost { get; init; }

    public required Money Budget { get; init; }

    public required TimeSpan DailyDrivingCap { get; init; }

    public required int Month { get; init; }

    public required IReadOnlyList<Climate> Climates { get; init; }

    public required int VehicleCount { get; init; }
}

/// <summary>هشدارها و توصیه‌های لیدر.</summary>
/// <remarks>
/// <para>
/// این همان چیزی است که «فهرست جاهای دیدنی» را به «دستیار لیدر» تبدیل می‌کند:
/// برنامه‌ای که روی کاغذ شدنی است ممکن است در جاده نباشد، و کسی باید پیش از
/// حرکت بگوید کجا.
/// </para>
/// <para>
/// هر قاعده یک متد جداست و همه در یک فهرست جمع می‌شوند — افزودن هشدار تازه فقط
/// «افزودن» است. متن‌ها عمداً کاری را که می‌شود کرد هم می‌گویند: هشداری که
/// راه‌حل ندارد، فقط نگرانی تولید می‌کند.
/// </para>
/// </remarks>
public static class Advisor
{
    /// <summary>بیش از این ساعت رانندگی در روز، خستگی جدی است.</summary>
    private const double TiringDrivingHours = 6;

    public static IReadOnlyList<Advice> Advise(AdviceContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var advice = new List<Advice>();

        AddDrivingFatigue(context, advice);
        AddSingleDriver(context, advice);
        AddPhysicalStrain(context, advice);
        AddVehicleFit(context, advice);
        AddSeating(context, advice);
        AddBudget(context, advice);
        AddClimate(context, advice);
        AddNowruz(context, advice);

        return advice.OrderByDescending(a => a.Level).ToList();
    }

    private static void AddDrivingFatigue(AdviceContext context, List<Advice> advice)
    {
        var worst = context.Days.MaxBy(d => d.DrivingTime);

        if (worst is null || worst.DrivingTime.TotalHours < TiringDrivingHours)
        {
            return;
        }

        advice.Add(new Advice(
            "driving.fatigue",
            worst.DrivingTime.TotalHours >= TiringDrivingHours + 2 ? AdviceLevel.Critical : AdviceLevel.Warning,
            "رانندگی طولانی",
            string.Create(
                CultureInfo.InvariantCulture,
                $"روز {worst.Index} حدود {worst.DrivingTime.TotalHours:0.#} ساعت رانندگی دارد. یا یک جاذبه را حذف کنید، یا شب را در شهر میانی بمانید.")));
    }

    private static void AddSingleDriver(AdviceContext context, List<Advice> advice)
    {
        int drivers = context.Group.Travelers.Count(t => t.IsDriver && t.Age >= 18);
        double totalHours = context.Days.Sum(d => d.DrivingTime.TotalHours);

        if (drivers > 1 || totalHours < 12)
        {
            return;
        }

        advice.Add(new Advice(
            "driving.soloDriver",
            AdviceLevel.Warning,
            "فقط یک راننده",
            string.Create(
                CultureInfo.InvariantCulture,
                $"مجموع {totalHours:0.#} ساعت رانندگی بر عهدهٔ یک نفر است. اگر همسفر دیگری گواهی‌نامه دارد، او را هم راننده علامت بزنید.")));
    }

    private static void AddPhysicalStrain(AdviceContext context, List<Advice> advice)
    {
        var hard = context.VisitedPois.Where(p => p.Difficulty >= Difficulty.Heavy).ToList();

        if (hard.Count == 0 || context.Group.Stamina > 0.7)
        {
            return;
        }

        advice.Add(new Advice(
            "group.strain",
            AdviceLevel.Warning,
            "فشار جسمی",
            string.Create(
                CultureInfo.InvariantCulture,
                $"{hard.Count} جاذبهٔ برنامه پیاده‌روی سنگین دارد و توان گروه برای آن‌ها کم است. برای کودک یا سالمند، جایگزین سبک‌تر در نظر بگیرید.")));
    }

    private static void AddVehicleFit(AdviceContext context, List<Advice> advice)
    {
        if (context.Vehicle.Offroad != OffroadCapability.Paved)
        {
            return;
        }

        bool mountainNights = context.Climates.Contains(Climate.Mountain);
        bool winter = context.Month is 12 or 1 or 2;

        if (!mountainNights || !winter)
        {
            return;
        }

        advice.Add(new Advice(
            "vehicle.winterMountain",
            AdviceLevel.Critical,
            "جادهٔ کوهستانی در زمستان",
            "برنامه شب را در منطقهٔ کوهستانی می‌گذراند و خودروی انتخابی سواری است. "
            + "زنجیر چرخ و لاستیک زمستانی ببرید و وضعیت جاده را روز حرکت بررسی کنید."));
    }

    private static void AddSeating(AdviceContext context, List<Advice> advice)
    {
        int capacity = context.Vehicle.Seats * context.VehicleCount;

        if (context.Group.Count <= capacity)
        {
            return;
        }

        advice.Add(new Advice(
            "vehicle.capacity",
            AdviceLevel.Critical,
            "کمبود صندلی",
            string.Create(
                CultureInfo.InvariantCulture,
                $"{context.Group.Count} همسفر در {capacity} صندلی جا نمی‌شوند. تعداد خودرو را زیاد کنید یا خودروی بزرگ‌تری انتخاب کنید.")));
    }

    private static void AddBudget(AdviceContext context, List<Advice> advice)
    {
        if (context.Budget == Money.Zero)
        {
            return;
        }

        if (context.Cost.Total > context.Budget)
        {
            advice.Add(new Advice(
                "budget.over",
                AdviceLevel.Critical,
                "بیشتر از بودجه",
                $"تخمین هزینه {context.Cost.Total} است در برابر بودجهٔ {context.Budget}. "
                + "کوتاه‌کردن سفر، پایین‌آوردن سطح اقامت، یا کم‌کردن شعاع، سه راه معمول کاهش‌اند."));

            return;
        }

        // سناریوی بدبینانه هم بخشی از واقعیت است: بودجه‌ای که فقط با تخمین
        // میانه جور درمی‌آید، در جاده تنگ می‌شود.
        if (context.Cost.Pessimistic > context.Budget)
        {
            advice.Add(new Advice(
                "budget.tight",
                AdviceLevel.Warning,
                "بودجهٔ تنگ",
                $"تخمین میانه در بودجه جا می‌شود ولی سناریوی بدبینانه ({context.Cost.Pessimistic}) نه. "
                + "کمی ذخیره کنار بگذارید."));
        }
    }

    private static void AddClimate(AdviceContext context, List<Advice> advice)
    {
        bool desert = context.Climates.Contains(Climate.Desert);
        bool gulf = context.Climates.Contains(Climate.Gulf);
        bool summer = context.Month is 6 or 7 or 8;

        if ((desert || gulf) && summer)
        {
            advice.Add(new Advice(
                "climate.summerHeat",
                AdviceLevel.Critical,
                "گرمای شدید",
                "این مسیر در تابستان از منطقهٔ گرم می‌گذرد. بازدیدها را به صبح زود و "
                + "غروب ببرید، آب فراوان ببرید و وسط روز استراحت کنید."));
        }

        if (context.Climates.Contains(Climate.Caspian) && context.Month is 4 or 5 or 6 or 9 or 10)
        {
            advice.Add(new Advice(
                "climate.caspianRain",
                AdviceLevel.Info,
                "احتمال باران",
                "سواحل خزر در این فصل باران دارد. بارانی و کفش ضدآب ببرید."));
        }
    }

    private static void AddNowruz(AdviceContext context, List<Advice> advice)
    {
        if (context.Month is not (3 or 4))
        {
            return;
        }

        advice.Add(new Advice(
            "season.nowruz",
            AdviceLevel.Warning,
            "اوج سفر نوروزی",
            "در این بازه قیمت اقامت بالاتر است و جاذبه‌ها شلوغ‌اند. "
            + "اقامت را از قبل رزرو کنید و بازدیدها را زودتر شروع کنید."));
    }
}

using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Trips.GeneratePlan;
using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Application.Trips.OptimizeBudget;

/// <summary>راه‌های کاهش هزینه، هرکدام با عدد صرفه‌جویی واقعی.</summary>
public sealed record OptimizeBudgetQuery : IQuery<BudgetLeversResponse>
{
    public required GeneratePlanQuery Trip { get; init; }
}

/// <param name="Id">شناسهٔ اهرم.</param>
/// <param name="Title">عنوان تغییر.</param>
/// <param name="Detail">توضیح اینکه چه چیزی عوض می‌شود و بهایش چیست.</param>
/// <param name="Saving">صرفه‌جویی واقعی به تومان.</param>
/// <param name="Patch">تغییری که باید روی ورودی اعمال شود تا این اهرم فعال شود.</param>
public sealed record BudgetLever(string Id, string Title, string Detail, decimal Saving, LeverPatch Patch);

/// <summary>تغییر پیشنهادی روی ورودی سفر — فقط فیلدهایی که عوض می‌شوند.</summary>
public sealed record LeverPatch
{
    public TravelStyle? Style { get; init; }

    public LodgingKind? Lodging { get; init; }

    public int? Days { get; init; }

    public double? RadiusKm { get; init; }

    public int? VehicleCount { get; init; }

    public decimal? SubsidizedFuelShare { get; init; }

    public IReadOnlyList<string>? ExcludedPoiIds { get; init; }
}

public sealed record BudgetLeversResponse(decimal Baseline, IReadOnlyList<BudgetLever> Levers);

internal sealed class OptimizeBudgetHandler : IQueryHandler<OptimizeBudgetQuery, BudgetLeversResponse>
{
    private static readonly Dictionary<TravelStyle, TravelStyle> CheaperStyle = new()
    {
        [TravelStyle.Luxury] = TravelStyle.Comfort,
        [TravelStyle.Comfort] = TravelStyle.Balanced,
        [TravelStyle.Balanced] = TravelStyle.Budget,
    };

    private readonly IQueryHandler<GeneratePlanQuery, TripPlanResponse> _planner;

    public OptimizeBudgetHandler(IQueryHandler<GeneratePlanQuery, TripPlanResponse> planner) =>
        _planner = planner;

    /// <summary>
    /// صرفه‌جویی هر اهرم <b>تخمین زده نمی‌شود</b> — برنامه با آن تغییر دوباره
    /// ساخته می‌شود و اختلاف واقعی جمع کل گزارش می‌شود.
    /// </summary>
    /// <remarks>
    /// <para>
    /// بهایش چند بار اجرای موتور است. سودش این است که عدد روی صفحه واقعاً همان
    /// چیزی است که اتفاق می‌افتد: «کمپینگ ۴٫۲ میلیون کم می‌کند» نه «حدود
    /// ۳۰ درصد اقامت». کاربری که یک‌بار عدد تخمینی را باور کند و بعد نبیند،
    /// دیگر هیچ عددی را باور نمی‌کند.
    /// </para>
    /// <para>
    /// هیچ اهرمی خودکار اعمال نمی‌شود؛ فقط گزینه‌ها با عددشان برمی‌گردند.
    /// تصمیم با لیدر است.
    /// </para>
    /// </remarks>
    public async Task<Result<BudgetLeversResponse>> HandleAsync(
        OptimizeBudgetQuery query,
        CancellationToken cancellationToken)
    {
        var baseline = await _planner.HandleAsync(query.Trip, cancellationToken).ConfigureAwait(false);

        if (baseline.IsFailure)
        {
            return Result.Failure<BudgetLeversResponse>(baseline.Error);
        }

        decimal baselineTotal = baseline.Value.Cost.Total;
        var levers = new List<BudgetLever>();

        foreach (var candidate in Candidates(query.Trip, baseline.Value))
        {
            var alternative = await _planner
                .HandleAsync(Apply(query.Trip, candidate.Patch), cancellationToken)
                .ConfigureAwait(false);

            // اهرمی که برنامهٔ معتبر نمی‌دهد، کنار گذاشته می‌شود — نه اینکه با
            // عدد صفر نمایش داده شود.
            if (alternative.IsFailure)
            {
                continue;
            }

            decimal saving = baselineTotal - alternative.Value.Cost.Total;

            if (saving > 0)
            {
                levers.Add(candidate with { Saving = saving });
            }
        }

        return new BudgetLeversResponse(baselineTotal, [.. levers.OrderByDescending(l => l.Saving)]);
    }

    private static IEnumerable<BudgetLever> Candidates(GeneratePlanQuery trip, TripPlanResponse plan)
    {
        if (CheaperStyle.TryGetValue(trip.Style, out var cheaper))
        {
            yield return new BudgetLever(
                "style",
                $"سطح سفر: {Label(trip.Style)} ← {Label(cheaper)}",
                "اقامت و رستوران یک پله ارزان‌تر می‌شود؛ مسیر و جاذبه‌ها دست‌نخورده می‌مانند.",
                0,
                new LeverPatch { Style = cheaper });
        }

        if (trip.Lodging != LodgingKind.Camp && trip.Days > 1)
        {
            yield return new BudgetLever(
                "camp",
                "اقامت: کمپینگ به‌جای اقامتگاه",
                "هزینهٔ اقامت تقریباً حذف می‌شود. چادر و کیسه‌خواب لازم است.",
                0,
                new LeverPatch { Lodging = LodgingKind.Camp });
        }

        // حذف جاذبه‌های بلیت‌دارِ گران: هم بلیتشان صرفه‌جویی می‌شود، هم مسافت
        // انحرافی‌شان.
        var expensive = plan.Days
            .SelectMany(d => d.Blocks)
            .Where(b => b.Kind == Domain.Planning.BlockKind.Visit && b.PoiId is not null && b.Cost > 0)
            .OrderByDescending(b => b.Cost)
            .Take(2)
            .ToList();

        if (expensive.Count > 0)
        {
            yield return new BudgetLever(
                "dropPois",
                $"حذف {expensive.Count} بازدید گران‌تر",
                string.Join(" و ", expensive.Select(b => b.Title)) + " — بلیت و مسافت انحرافی‌شان حذف می‌شود.",
                0,
                new LeverPatch
                {
                    ExcludedPoiIds = [.. trip.ExcludedPoiIds, .. expensive.Select(b => b.PoiId!)],
                });
        }

        if (trip.RadiusKm > 100)
        {
            double next = Math.Round(trip.RadiusKm * 0.7 / 25) * 25;

            yield return new BudgetLever(
                "radius",
                $"کاهش شعاع سفر به {next:0} کیلومتر",
                "مقصدهای نزدیک‌تر یعنی سوخت، عوارض و استهلاک کمتر.",
                0,
                new LeverPatch { RadiusKm = next });
        }

        if (trip.Days > 1)
        {
            yield return new BudgetLever(
                "days",
                $"کوتاه‌کردن سفر به {trip.Days - 1} روز",
                "یک شب اقامت و یک روز خوراک کامل حذف می‌شود.",
                0,
                new LeverPatch { Days = trip.Days - 1 });
        }

        if (trip.SubsidizedFuelShare < 1)
        {
            yield return new BudgetLever(
                "fuel",
                "تأمین کل سوخت با نرخ سهمیه‌ای",
                "اگر سهمیهٔ کارت سوخت کفاف بدهد، اختلاف نرخ آزاد حذف می‌شود.",
                0,
                new LeverPatch { SubsidizedFuelShare = 1m });
        }

        if (trip.VehicleCount > 1)
        {
            yield return new BudgetLever(
                "vehicles",
                $"کاهش تعداد خودرو به {trip.VehicleCount - 1}",
                "سوخت، عوارض و استهلاک به‌نسبت کم می‌شود — اگر ظرفیت سرنشین اجازه بدهد.",
                0,
                new LeverPatch { VehicleCount = trip.VehicleCount - 1 });
        }
    }

    private static GeneratePlanQuery Apply(GeneratePlanQuery trip, LeverPatch patch) => trip with
    {
        Style = patch.Style ?? trip.Style,
        Lodging = patch.Lodging ?? trip.Lodging,
        Days = patch.Days ?? trip.Days,
        RadiusKm = patch.RadiusKm ?? trip.RadiusKm,
        VehicleCount = patch.VehicleCount ?? trip.VehicleCount,
        SubsidizedFuelShare = patch.SubsidizedFuelShare ?? trip.SubsidizedFuelShare,
        ExcludedPoiIds = patch.ExcludedPoiIds ?? trip.ExcludedPoiIds,
    };

    private static string Label(TravelStyle style) => style switch
    {
        TravelStyle.Budget => "اقتصادی",
        TravelStyle.Balanced => "متعادل",
        TravelStyle.Comfort => "راحت",
        TravelStyle.Luxury => "لوکس",
        _ => style.ToString(),
    };
}

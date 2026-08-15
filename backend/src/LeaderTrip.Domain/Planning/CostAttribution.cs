using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Planning;

/// <summary>پخش هزینهٔ سفر روی روزها و بلوک‌های برنامه.</summary>
/// <remarks>
/// <para>
/// موتور هزینه جمع کل هر قلم را می‌دهد؛ زمان‌بند ساختار روزها را. تا وقتی این
/// دو به هم وصل نشوند، هر روز «۰ تومان» است — و صفر روی صفحه یعنی «رایگان»،
/// نه «هنوز حساب نشده». برای محصولی که ادعایش ردیابی هر ریال است، این بدترین
/// جور خطاست: بی‌صدا و باورپذیر.
/// </para>
/// <para>
/// <b>قاعدهٔ اصلی:</b> جمع هزینهٔ روزها باید <em>دقیقاً</em> برابر
/// <see cref="CostBreakdown.Subtotal"/> باشد. باقی‌ماندهٔ گردکردن به آخرین
/// دریافت‌کننده اضافه می‌شود تا این تساوی ساختاری بماند، نه تقریبی. تست
/// <c>Attribution_SumsExactlyTo_Subtotal</c> نگهبانش است.
/// </para>
/// </remarks>
public static class CostAttribution
{
    /// <summary>هزینهٔ هر قلم را روی بلوک‌های مناسب می‌نشاند.</summary>
    /// <param name="days">روزهای زمان‌بندی‌شده.</param>
    /// <param name="cost">تفکیک هزینهٔ محاسبه‌شده.</param>
    /// <param name="ticketPerPoi">سهم بلیت هر جاذبه برای این گروه.</param>
    /// <returns>همان روزها، با هزینهٔ پرشده.</returns>
    public static IReadOnlyList<DayPlan> Attribute(
        IReadOnlyList<DayPlan> days,
        CostBreakdown cost,
        IReadOnlyDictionary<string, Money> ticketPerPoi)
    {
        ArgumentNullException.ThrowIfNull(days);
        ArgumentNullException.ThrowIfNull(cost);
        ArgumentNullException.ThrowIfNull(ticketPerPoi);

        if (days.Count == 0)
        {
            return days;
        }

        var amounts = cost.Lines.ToDictionary(l => l.Key, l => l.Amount.Amount, StringComparer.Ordinal);
        var perBlock = new Dictionary<(int Day, int Block), decimal>();

        // ─── مسافت‌محور: سوخت، عوارض، اهلاک روی بلوک‌های رانندگی ───
        decimal roadTotal = Sum(amounts, "fuel") + Sum(amounts, "toll") + Sum(amounts, "depreciation");
        Spread(days, perBlock, roadTotal, BlockKind.Drive, block => (decimal)(block.DistanceCovered?.Kilometers ?? 0));

        // ─── خوراک: به‌طور مساوی روی وعده‌ها ───
        Spread(days, perBlock, Sum(amounts, "meals"), BlockKind.Meal, _ => 1m);

        // ─── اقامت: روی شب‌ها ───
        Spread(days, perBlock, Sum(amounts, "lodging"), BlockKind.Lodging, _ => 1m);

        // ─── تنقلات: روی استراحت‌ها؛ اگر استراحتی نبود، روی وعده‌ها ───
        decimal snacks = Sum(amounts, "snacks");
        bool hasRest = days.Any(d => d.Blocks.Any(b => b.Kind == BlockKind.Rest));
        Spread(days, perBlock, snacks, hasRest ? BlockKind.Rest : BlockKind.Meal, _ => 1m);

        // ─── بلیت: روی همان بازدیدی که بلیتش را دارد ───
        AttributeTickets(days, perBlock, Sum(amounts, "tickets"), ticketPerPoi);

        return Rebuild(days, perBlock);
    }

    private static decimal Sum(Dictionary<string, decimal> amounts, string key) =>
        amounts.TryGetValue(key, out decimal value) ? value : 0m;

    /// <summary>
    /// پخش یک مبلغ روی بلوک‌های یک نوع، به نسبت وزن.
    /// </summary>
    /// <remarks>
    /// آخرین بلوک باقی‌ماندهٔ گردکردن را می‌گیرد. بدون آن، جمع اجزا چند تومان
    /// با کل فرق می‌کرد — و کاربری که جمع می‌زند، همان چند تومان را می‌بیند و
    /// به کل گزارش شک می‌کند.
    /// </remarks>
    private static void Spread(
        IReadOnlyList<DayPlan> days,
        Dictionary<(int Day, int Block), decimal> perBlock,
        decimal amount,
        BlockKind kind,
        Func<PlanBlock, decimal> weightOf)
    {
        if (amount <= 0)
        {
            return;
        }

        var targets = new List<((int Day, int Block) Key, decimal Weight)>();

        for (int d = 0; d < days.Count; d++)
        {
            var blocks = days[d].Blocks;

            for (int b = 0; b < blocks.Count; b++)
            {
                if (blocks[b].Kind == kind)
                {
                    targets.Add(((d, b), weightOf(blocks[b])));
                }
            }
        }

        if (targets.Count == 0)
        {
            return;
        }

        decimal totalWeight = targets.Sum(t => t.Weight);

        // وزن صفر (مثلاً همهٔ مسافت‌ها صفر) یعنی پخش مساوی، نه تقسیم بر صفر.
        if (totalWeight <= 0)
        {
            targets = [.. targets.Select(t => (t.Key, Weight: 1m))];
            totalWeight = targets.Count;
        }

        decimal assigned = 0m;

        for (int i = 0; i < targets.Count; i++)
        {
            decimal share = i == targets.Count - 1
                ? amount - assigned
                : Math.Round(amount * targets[i].Weight / totalWeight, 0, MidpointRounding.AwayFromZero);

            assigned += share;
            perBlock[targets[i].Key] = perBlock.GetValueOrDefault(targets[i].Key) + share;
        }
    }

    /// <summary>
    /// بلیت روی همان بازدید می‌نشیند، نه پخش‌شده.
    /// </summary>
    /// <remarks>
    /// بلیت تنها قلمی است که مقصد طبیعی و دقیق دارد؛ پخش‌کردنش یعنی بازدیدِ
    /// رایگان هم بلیت‌دار به‌نظر برسد. باقی‌ماندهٔ گردکردن به آخرین بازدید
    /// بلیت‌دار می‌رود تا جمع دست‌نخورده بماند.
    /// </remarks>
    private static void AttributeTickets(
        IReadOnlyList<DayPlan> days,
        Dictionary<(int Day, int Block), decimal> perBlock,
        decimal ticketTotal,
        IReadOnlyDictionary<string, Money> ticketPerPoi)
    {
        if (ticketTotal <= 0)
        {
            return;
        }

        var paid = new List<((int Day, int Block) Key, decimal Amount)>();

        for (int d = 0; d < days.Count; d++)
        {
            var blocks = days[d].Blocks;

            for (int b = 0; b < blocks.Count; b++)
            {
                if (blocks[b].Kind != BlockKind.Visit || blocks[b].PoiId is not { } poiId)
                {
                    continue;
                }

                if (ticketPerPoi.TryGetValue(poiId, out var ticket) && ticket.Amount > 0)
                {
                    paid.Add(((d, b), ticket.Amount));
                }
            }
        }

        if (paid.Count == 0)
        {
            return;
        }

        decimal declared = paid.Sum(p => p.Amount);
        decimal assigned = 0m;

        for (int i = 0; i < paid.Count; i++)
        {
            decimal share = i == paid.Count - 1
                ? ticketTotal - assigned
                : Math.Round(ticketTotal * paid[i].Amount / declared, 0, MidpointRounding.AwayFromZero);

            assigned += share;
            perBlock[paid[i].Key] = perBlock.GetValueOrDefault(paid[i].Key) + share;
        }
    }

    private static List<DayPlan> Rebuild(
        IReadOnlyList<DayPlan> days,
        IReadOnlyDictionary<(int Day, int Block), decimal> perBlock)
    {
        var rebuilt = new List<DayPlan>(days.Count);

        for (int d = 0; d < days.Count; d++)
        {
            var blocks = new List<PlanBlock>(days[d].Blocks.Count);
            decimal dayTotal = 0m;

            for (int b = 0; b < days[d].Blocks.Count; b++)
            {
                decimal amount = perBlock.GetValueOrDefault((d, b));
                dayTotal += amount;

                blocks.Add(days[d].Blocks[b] with { Cost = Money.FromToman(amount) });
            }

            rebuilt.Add(days[d] with { Blocks = blocks, Cost = Money.FromToman(dayTotal) });
        }

        return rebuilt;
    }
}

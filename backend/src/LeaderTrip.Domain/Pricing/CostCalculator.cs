using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Pricing;

/// <summary>هزینهٔ کامل سفر را از اجزای مستقل می‌سازد.</summary>
/// <remarks>
/// این کلاس هیچ فرمولی نمی‌داند. اجزا از بیرون تزریق می‌شوند، پس افزودن قلم
/// هزینهٔ تازه هیچ تغییری این‌جا لازم ندارد.
/// </remarks>
public sealed class CostCalculator
{
    /// <summary>ضریب سناریوی خوش‌بینانه.</summary>
    public const decimal OptimisticFactor = 0.85m;

    /// <summary>ضریب سناریوی بدبینانه.</summary>
    public const decimal PessimisticFactor = 1.25m;

    private readonly List<ICostComponent> _components;

    public CostCalculator(IEnumerable<ICostComponent> components) =>
        _components = components.OrderBy(c => c.Order).ToList();

    public CostBreakdown Calculate(CostContext context)
    {
        var lines = _components.Select(c => c.Calculate(context)).ToList();

        var subtotal = lines.Aggregate(Money.Zero, (sum, line) => sum + line.Amount);
        var misc = subtotal * context.Prices.MiscRate[context.Style];
        var buffer = (subtotal + misc) * context.Prices.BufferRate[context.Style];
        var total = subtotal + misc + buffer;

        return new CostBreakdown
        {
            Lines = lines,
            Subtotal = subtotal,
            Miscellaneous = misc,
            RiskBuffer = buffer,
            Total = total,
            PerPerson = total * (1m / Math.Max(1, context.Group.Count)),
            Optimistic = total * OptimisticFactor,
            Pessimistic = total * PessimisticFactor,
        };
    }
}

using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Pricing;

/// <summary>تفکیک کامل هزینهٔ سفر.</summary>
public sealed record CostBreakdown
{
    public required IReadOnlyList<CostLine> Lines { get; init; }

    public required Money Subtotal { get; init; }

    public required Money Miscellaneous { get; init; }

    public required Money RiskBuffer { get; init; }

    public required Money Total { get; init; }

    public required Money PerPerson { get; init; }

    /// <summary>سناریوی خوش‌بینانه — ۸۵٪ جمع کل.</summary>
    public required Money Optimistic { get; init; }

    /// <summary>سناریوی بدبینانه — ۱۲۵٪ جمع کل.</summary>
    public required Money Pessimistic { get; init; }
}

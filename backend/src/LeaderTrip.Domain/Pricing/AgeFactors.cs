namespace LeaderTrip.Domain.Pricing;

/// <summary>ضریب‌های سنی هزینه.</summary>
/// <remarks>
/// جدا نگه داشته شده‌اند چون قاعده‌های واقعی کسب‌وکارند و جدا از هم عوض می‌شوند:
/// تخفیف بلیت کودک ربطی به سهم غذای او ندارد.
/// </remarks>
public static class AgeFactors
{
    /// <summary>ضریب بلیت ورودی.</summary>
    public static decimal Ticket(int age) => age switch
    {
        < 5 => 0m,
        <= 12 => 0.5m,
        >= 65 => 0.7m,
        _ => 1m,
    };

    /// <summary>ضریب سهم از خوراک.</summary>
    public static decimal Meal(int age) => age switch
    {
        < 6 => 0.4m,
        <= 12 => 0.7m,
        _ => 1m,
    };

    /// <summary>ضریب سهم از اقامت.</summary>
    public static decimal Lodging(int age) => age switch
    {
        < 3 => 0m,
        <= 10 => 0.5m,
        _ => 1m,
    };
}

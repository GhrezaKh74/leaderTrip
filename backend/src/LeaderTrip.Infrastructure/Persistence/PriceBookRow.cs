namespace LeaderTrip.Infrastructure.Persistence;

/// <summary>یک نسخهٔ دفترچهٔ قیمت، همان‌طور که در پایگاه داده ذخیره می‌شود.</summary>
/// <remarks>
/// <para>
/// محتوا به‌صورت یک ستون <c>jsonb</c> نگه داشته می‌شود، نه ده جدول نرمال‌شده.
/// دلیلش این نیست که راحت‌تر است — دلیلش شکل خودِ داده است: دفترچهٔ قیمت یک
/// «سند» است که یک‌جا خوانده و یک‌جا جایگزین می‌شود، نه مجموعه‌ای از رکوردهای
/// مستقل که کسی بخواهد تک‌تک روی‌شان کوئری بزند.
/// </para>
/// <para>
/// نسخه‌ها پاک نمی‌شوند و آخرین <see cref="EffectiveFrom"/> برنده است. یعنی
/// برنامه‌های ساخته‌شده در گذشته را می‌شود با قیمت‌های همان روز بازسازی کرد —
/// چیزی که با به‌روزرسانی درجا از دست می‌رفت.
/// </para>
/// </remarks>
public sealed class PriceBookRow
{
    public PriceBookRow(int id, string payload, DateTimeOffset effectiveFrom)
    {
        Id = id;
        Payload = payload;
        EffectiveFrom = effectiveFrom;
    }

    public int Id { get; private set; }

    /// <summary>محتوای دفترچه به‌صورت JSON.</summary>
    public string Payload { get; private set; }

    public DateTimeOffset EffectiveFrom { get; private set; }
}

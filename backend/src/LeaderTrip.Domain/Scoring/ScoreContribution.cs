namespace LeaderTrip.Domain.Scoring;

/// <summary>سهم یک قاعده در امتیاز نهایی یک جاذبه.</summary>
/// <remarks>
/// <para>
/// چرا هم <see cref="Additive"/> و هم <see cref="Multiplier"/>؟ این گران‌ترین
/// درسِ نسخهٔ قبلی است و این‌جا در خودِ تایپ ثبت شده تا دوباره تکرار نشود:
/// </para>
/// <para>
/// انتخاب جاذبه‌ها بر پایهٔ «امتیاز به ازای دقیقهٔ اضافه‌شده به سفر» است. در
/// چنین معیاری یک پاداش <b>جمعی</b> در برابر دوبرابرشدن زمان رسیدن محو می‌شود؛
/// دو بار — یک‌بار برای آب‌وهوا و یک‌بار برای سلیقهٔ آموخته‌شده — این اشتباه
/// تکرار شد و هر دو بار تست گرفتش. نصف‌شدن ارزش یک بازدید اما دقیقاً هم‌وزن
/// دوبرابرشدن مسافت است.
/// </para>
/// <para>
/// قاعدهٔ سرانگشتی: ترجیح‌های خفیف جمعی‌اند؛ چیزی که باید در برابر جغرافیا
/// بایستد باید ضربی باشد.
/// </para>
/// </remarks>
public readonly record struct ScoreContribution
{
    private ScoreContribution(double additive, double multiplier, string explanation)
    {
        Additive = additive;
        Multiplier = multiplier;
        Explanation = explanation;
    }

    /// <summary>سهمی که خنثی است — قاعده چیزی برای گفتن نداشت.</summary>
    public static ScoreContribution Neutral { get; } = new(0, 1, string.Empty);

    public double Additive { get; }

    public double Multiplier { get; }

    /// <summary>توضیح خوانا — «چرا این امتیاز؟» باید همیشه جواب داشته باشد.</summary>
    public string Explanation { get; }

    public static ScoreContribution Add(double points, string explanation) =>
        new(points, 1, explanation);

    public static ScoreContribution Scale(double factor, string explanation) =>
        new(0, factor, explanation);

    public static ScoreContribution Combined(double points, double factor, string explanation) =>
        new(points, factor, explanation);
}

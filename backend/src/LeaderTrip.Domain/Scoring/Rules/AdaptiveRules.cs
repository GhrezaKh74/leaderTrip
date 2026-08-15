using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Domain.Scoring.Rules;

/// <summary>اثر آب‌وهوا بر ارزش یک بازدید.</summary>
/// <remarks>
/// عمداً <b>ضربی</b> است. نسخهٔ اول جمعی بود و هیچ اثری روی انتخاب نداشت:
/// امتیازها درست جابه‌جا می‌شدند ولی مجموعهٔ انتخاب‌شده تغییری نمی‌کرد، چون
/// در معیارِ «ارزش به ازای زمان»، ۲۰ امتیاز در برابر دوبرابر شدن مسافت هیچ است.
/// </remarks>
public sealed class WeatherSuitabilityRule : IPoiScoringRule
{
    private const double HeatThreshold = 38d;
    private const double RainThreshold = 60d;

    public string Name => "شرایط جوی";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        if (context.Weather is not { } weather)
        {
            return ScoreContribution.Neutral;
        }

        double factor = 1;
        var reasons = new List<string>(2);

        if (weather.AveragePrecipitationProbability >= RainThreshold)
        {
            factor *= poi.IsIndoor ? 1.30 : 0.60;
            reasons.Add(poi.IsIndoor ? "سرپوشیده در روز بارانی" : "فضای باز در روز بارانی");
        }
        else if (weather.AveragePrecipitationProbability >= 35)
        {
            factor *= poi.IsIndoor ? 1.12 : 0.85;
            reasons.Add(poi.IsIndoor ? "سرپوشیده و احتمال بارش" : "احتمال بارش");
        }

        if (weather.AverageMaxTemperature >= HeatThreshold && !poi.IsIndoor)
        {
            bool longVisit = poi.VisitDuration > TimeSpan.FromMinutes(90);
            factor *= longVisit ? 0.65 : 0.85;
            reasons.Add(longVisit ? "بازدید طولانی در گرمای شدید" : "فضای باز در گرمای شدید");
        }

        if (weather.HasSnow && poi.Difficulty >= Difficulty.Heavy)
        {
            factor *= 0.50;
            reasons.Add("مسیر سخت در برف");
        }

        return factor == 1
            ? ScoreContribution.Neutral
            : ScoreContribution.Scale(factor, string.Join(" · ", reasons));
    }
}

/// <summary>سلیقه‌ای که از امتیازهای سفرهای گذشتهٔ همین کاربر آموخته شده.</summary>
/// <remarks>
/// این هم به همان دلیل ضربی است. سقفش عمداً پایین است: سلیقهٔ گذشته باید
/// انتخاب را متمایل کند، نه اینکه برنامه را برباید.
/// </remarks>
public sealed class LearnedTasteRule : IPoiScoringRule
{
    /// <summary>بیشترین انحراف ارزش که سلیقه اجازه دارد ایجاد کند.</summary>
    public const double Strength = 0.25;

    public string Name => "سلیقهٔ سفرهای قبلی شما";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        if (!context.LearnedTaste.TryGetValue(poi.Category, out double bias) || bias == 0)
        {
            return ScoreContribution.Neutral;
        }

        double clamped = Math.Clamp(bias, -1, 1);
        return ScoreContribution.Scale(
            1 + (Strength * clamped),
            clamped > 0 ? "از این دسته خوشتان می‌آید" : "از این دسته کمتر خوشتان می‌آید");
    }
}

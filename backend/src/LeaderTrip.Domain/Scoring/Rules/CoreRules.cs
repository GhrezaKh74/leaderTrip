using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Scoring.Rules;

/// <summary>تطابق با علاقه‌مندی‌هایی که کاربر انتخاب کرده.</summary>
public sealed class InterestMatchRule : IPoiScoringRule
{
    public string Name => "تطابق با علایق";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        if (context.Interests.Count == 0)
        {
            return ScoreContribution.Neutral;
        }

        return context.Interests.Contains(poi.Category)
            ? ScoreContribution.Add(25, "در فهرست علاقه‌مندی‌های شماست")
            : ScoreContribution.Add(-8, "خارج از علاقه‌مندی‌های انتخابی");
    }
}

/// <summary>کیفیت عمومی جاذبه.</summary>
public sealed class GeneralQualityRule : IPoiScoringRule
{
    public string Name => "کیفیت عمومی";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        double points = 12 * (poi.Rating - 3);
        return points == 0
            ? ScoreContribution.Neutral
            : ScoreContribution.Add(points, $"امتیاز عمومی {poi.Rating:0.#} از ۵");
    }
}

/// <summary>بودن در فصل مناسب.</summary>
/// <remarks>
/// بازهٔ فصلی کوتاه‌تر پاداش بیشتری می‌گیرد: جاذبه‌ای که فقط چهار ماه سال
/// دیدنی است و الان دقیقاً همان چهار ماه است، فرصتی است که نباید از دست رفت.
/// </remarks>
public sealed class SeasonFitRule : IPoiScoringRule
{
    public string Name => "تناسب فصل";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        if (!poi.IsInSeason(context.Month))
        {
            return ScoreContribution.Neutral;
        }

        return poi.BestMonths.Count <= 6
            ? ScoreContribution.Add(15, "دقیقاً فصلش است")
            : ScoreContribution.Add(8, "فصل مناسبی است");
    }
}

/// <summary>تناسب با ترکیب سنی گروه.</summary>
public sealed class AgeSuitabilityRule : IPoiScoringRule
{
    public string Name => "تناسب سنی گروه";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        double points = 0;
        var reasons = new List<string>(2);

        if (context.Group.HasToddler || context.Group.HasChild)
        {
            points += poi.IsKidFriendly ? 10 : -12;
            reasons.Add(poi.IsKidFriendly ? "مناسب کودک" : "برای کودک مناسب نیست");

            if (poi.Difficulty >= Difficulty.Heavy)
            {
                points -= 15;
                reasons.Add("پیاده‌روی سنگین با کودک");
            }
        }

        if (context.Group.HasSenior)
        {
            points += poi.IsSeniorFriendly ? 10 : -12;
            reasons.Add(poi.IsSeniorFriendly ? "مناسب سالمند" : "برای سالمند مناسب نیست");

            if (poi.VisitDuration > TimeSpan.FromMinutes(120))
            {
                points -= 8;
                reasons.Add("بازدید طولانی برای سالمند");
            }
        }

        return points == 0
            ? ScoreContribution.Neutral
            : ScoreContribution.Add(points, string.Join(" · ", reasons));
    }
}

/// <summary>جریمهٔ دور بودن از مبدأ.</summary>
public sealed class DetourPenaltyRule : IPoiScoringRule
{
    public string Name => "فاصله از مسیر";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        var distance = context.Origin.StraightLineTo(poi.Location);
        double normalized = Math.Min(1, distance.Kilometers / Math.Max(1, context.SearchRadius.Kilometers));

        return normalized == 0
            ? ScoreContribution.Neutral
            : ScoreContribution.Add(-20 * normalized, $"{distance.Kilometers:0} کیلومتر از مبدأ");
    }
}

/// <summary>جریمهٔ بلیت گران نسبت به بودجهٔ روزانهٔ هر نفر.</summary>
public sealed class TicketAffordabilityRule : IPoiScoringRule
{
    public string Name => "تناسب بلیت با بودجه";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context)
    {
        if (poi.IsFree)
        {
            return ScoreContribution.Add(4, "ورود رایگان");
        }

        if (context.PerPersonDailyBudget <= Money.Zero)
        {
            return ScoreContribution.Neutral;
        }

        decimal threshold = context.PerPersonDailyBudget.Amount * 0.4m;
        double ratio = threshold <= 0 ? 1 : Math.Min(1d, (double)(poi.Ticket.Amount / threshold));

        return ratio == 0
            ? ScoreContribution.Neutral
            : ScoreContribution.Add(-10 * ratio, $"بلیت {poi.Ticket}");
    }
}

/// <summary>خواستهٔ صریح کاربر — همیشه آخر از همه اعمال می‌شود.</summary>
public sealed class PinnedByUserRule : IPoiScoringRule
{
    public string Name => "انتخاب صریح شما";

    public ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context) =>
        context.PinnedPoiIds.Contains(poi.Id)
            ? ScoreContribution.Add(30, "خودتان «حتماً برو» کرده‌اید")
            : ScoreContribution.Neutral;
}

using LeaderTrip.Domain.Entities;

namespace LeaderTrip.Domain.Scoring;

/// <summary>امتیاز یک جاذبه را برای یک گروه مشخص حساب می‌کند.</summary>
/// <remarks>
/// این کلاس هیچ قاعده‌ای نمی‌داند؛ فقط می‌داند چطور سهم‌ها را جمع کند. قاعده‌ها
/// از بیرون تزریق می‌شوند، پس این‌جا دیگر هرگز لازم نیست تغییر کند.
/// </remarks>
public sealed class PoiScorer
{
    /// <summary>امتیاز پایه، پیش از اعمال هر قاعده.</summary>
    public const double BaseScore = 100d;

    private readonly List<IPoiScoringRule> _rules;

    public PoiScorer(IEnumerable<IPoiScoringRule> rules) => _rules = rules.ToList();

    public PoiScore Score(PointOfInterest poi, ScoringContext context)
    {
        double additive = 0;
        double multiplier = 1;
        var breakdown = new List<ScoreBreakdownItem>(_rules.Count);

        foreach (var rule in _rules)
        {
            var contribution = rule.Evaluate(poi, context);
            if (contribution == ScoreContribution.Neutral)
            {
                continue;
            }

            additive += contribution.Additive;
            multiplier *= contribution.Multiplier;
            breakdown.Add(new ScoreBreakdownItem(rule.Name, contribution));
        }

        // جمعی‌ها اول، بعد ضربی‌ها: ضریب باید روی کل ارزش اثر بگذارد،
        // نه فقط روی سهم یک قاعده
        return new PoiScore((BaseScore + additive) * multiplier, breakdown);
    }
}

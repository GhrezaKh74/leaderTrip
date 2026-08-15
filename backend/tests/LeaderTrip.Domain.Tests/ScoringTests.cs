using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Scoring;
using LeaderTrip.Domain.Scoring.Rules;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

public class ScoringTests
{
    private static ScoringContext Context(
        TravelGroup? group = null,
        WeatherOutlook? weather = null,
        IReadOnlyDictionary<PoiCategory, double>? taste = null,
        params PoiCategory[] interests) =>
        new()
        {
            Group = group ?? TestData.Group(),
            Origin = TestData.Tehran,
            SearchRadius = Distance.FromKilometers(300),
            Month = 5,
            TripDays = 3,
            Interests = new HashSet<PoiCategory>(interests),
            PinnedPoiIds = new HashSet<string>(),
            PerPersonDailyBudget = Money.FromToman(2_000_000),
            Weather = weather,
            LearnedTaste = taste ?? new Dictionary<PoiCategory, double>(),
        };

    [Fact]
    public void Scorer_WithNoRules_ReturnsBaseScore()
    {
        var scorer = new PoiScorer([]);

        var score = scorer.Score(TestData.Poi(), Context());

        Assert.Equal(PoiScorer.BaseScore, score.Value);
        Assert.Empty(score.Breakdown);
    }

    [Fact]
    public void EveryContribution_CarriesAnExplanation()
    {
        var scorer = new PoiScorer([
            new InterestMatchRule(), new GeneralQualityRule(), new SeasonFitRule(),
            new AgeSuitabilityRule(), new DetourPenaltyRule(), new TicketAffordabilityRule(),
        ]);

        var score = scorer.Score(
            TestData.Poi(rating: 5, location: TestData.Isfahan),
            Context(interests: PoiCategory.Historical));

        Assert.NotEmpty(score.Breakdown);
        Assert.All(score.Breakdown, item => Assert.False(string.IsNullOrWhiteSpace(item.Contribution.Explanation)));
    }

    [Fact]
    public void InterestMatch_RaisesScore_AndMismatchLowersIt()
    {
        var scorer = new PoiScorer([new InterestMatchRule()]);
        var poi = TestData.Poi(category: PoiCategory.Waterfall);

        double matched = scorer.Score(poi, Context(interests: PoiCategory.Waterfall)).Value;
        double missed = scorer.Score(poi, Context(interests: PoiCategory.Museum)).Value;

        Assert.True(matched > missed);
    }

    [Fact]
    public void NoInterestsSelected_MeansNoOpinion()
    {
        var scorer = new PoiScorer([new InterestMatchRule()]);

        Assert.Equal(PoiScorer.BaseScore, scorer.Score(TestData.Poi(), Context()).Value);
    }

    // ─── درسی که دو بار در نسخهٔ قبلی به‌سختی آموخته شد ───

    [Fact]
    public void WeatherRule_IsMultiplicative_NotAdditive()
    {
        var rainy = new WeatherOutlook
        {
            AverageMaxTemperature = 16,
            AveragePrecipitationProbability = 90,
            HasSnow = false,
        };
        var rule = new WeatherSuitabilityRule();

        var outdoor = rule.Evaluate(TestData.Poi(indoor: false), Context(weather: rainy));
        var indoor = rule.Evaluate(TestData.Poi(indoor: true), Context(weather: rainy));

        // اثر باید روی ضریب باشد نه جمع — وگرنه در معیار «ارزش به ازای زمان» محو می‌شود
        Assert.Equal(0, outdoor.Additive);
        Assert.Equal(0, indoor.Additive);
        Assert.True(outdoor.Multiplier < 1);
        Assert.True(indoor.Multiplier > 1);
    }

    [Fact]
    public void LearnedTaste_IsMultiplicative_AndBounded()
    {
        var rule = new LearnedTasteRule();
        var loved = rule.Evaluate(
            TestData.Poi(category: PoiCategory.Waterfall),
            Context(taste: new Dictionary<PoiCategory, double> { [PoiCategory.Waterfall] = 1 }));

        Assert.Equal(0, loved.Additive);
        Assert.Equal(1 + LearnedTasteRule.Strength, loved.Multiplier, 6);
        Assert.True(LearnedTasteRule.Strength <= 0.3, "سلیقهٔ گذشته نباید برنامه را برباید");
    }

    [Fact]
    public void LearnedTaste_ClampsValuesOutsideRange()
    {
        var rule = new LearnedTasteRule();

        var contribution = rule.Evaluate(
            TestData.Poi(category: PoiCategory.Cave),
            Context(taste: new Dictionary<PoiCategory, double> { [PoiCategory.Cave] = 99 }));

        Assert.Equal(1 + LearnedTasteRule.Strength, contribution.Multiplier, 6);
    }

    [Fact]
    public void NoWeatherData_MeansNoWeatherOpinion() =>
        Assert.Equal(
            ScoreContribution.Neutral,
            new WeatherSuitabilityRule().Evaluate(TestData.Poi(), Context()));

    [Fact]
    public void MultiplierApplies_ToTheWholeScore_NotJustOneRule()
    {
        var rainy = new WeatherOutlook
        {
            AverageMaxTemperature = 16,
            AveragePrecipitationProbability = 90,
            HasSnow = false,
        };
        var scorer = new PoiScorer([new GeneralQualityRule(), new WeatherSuitabilityRule()]);
        var poi = TestData.Poi(rating: 5, indoor: false);

        double score = scorer.Score(poi, Context(weather: rainy)).Value;

        // (۱۰۰ + ۲۴) × ۰٫۶ — نه ۱۰۰ + ۲۴ × ۰٫۶
        Assert.Equal((PoiScorer.BaseScore + 24) * 0.60, score, 6);
    }

    [Fact]
    public void AgeSuitability_PenalisesHardVisitsWhenChildrenPresent()
    {
        var rule = new AgeSuitabilityRule();
        var withChild = Context(group: TestData.Group(TestData.Adult(), TestData.Child()));

        var easy = rule.Evaluate(TestData.Poi(difficulty: Difficulty.None), withChild);
        var hard = rule.Evaluate(TestData.Poi(difficulty: Difficulty.Heavy), withChild);

        Assert.True(hard.Additive < easy.Additive);
    }

    [Fact]
    public void FreeEntry_IsSlightlyPreferred() =>
        Assert.True(new TicketAffordabilityRule().Evaluate(TestData.Poi(ticket: 0), Context()).Additive > 0);

    [Fact]
    public void ExpensiveTicket_IsPenalisedRelativeToBudget()
    {
        var rule = new TicketAffordabilityRule();

        var cheap = rule.Evaluate(TestData.Poi(ticket: 50_000), Context());
        var pricey = rule.Evaluate(TestData.Poi(ticket: 900_000), Context());

        Assert.True(pricey.Additive < cheap.Additive);
    }
}

public class TravelGroupTests
{
    [Fact]
    public void Create_RejectsEmptyGroup() =>
        Assert.True(TravelGroup.Create([]).IsFailure);

    [Fact]
    public void Create_RejectsDuplicateIds() =>
        Assert.True(TravelGroup.Create([TestData.Adult("x"), TestData.Adult("x")]).IsFailure);

    [Fact]
    public void Stamina_EqualsWeakestMember()
    {
        var group = TestData.Group(TestData.Adult(), new Traveler("o", "o", 75, MobilityLevel.Full, false));

        Assert.Equal(0.40, group.Stamina, 6);
        Assert.Equal(Difficulty.Light, group.MaximumDifficulty);
    }

    [Fact]
    public void AllHealthyAdults_CanClimb() =>
        Assert.Equal(Difficulty.Climbing, TestData.Group(TestData.Adult(), TestData.Adult("b", 28)).MaximumDifficulty);

    [Fact]
    public void VisitDuration_StretchesWithChildrenAndSeniorsTogether()
    {
        var mixed = TestData.Group(
            TestData.Adult(), TestData.Child(), new Traveler("s", "s", 70, MobilityLevel.Full, false));

        Assert.Equal(1.30, mixed.VisitDurationFactor, 6);
    }
}

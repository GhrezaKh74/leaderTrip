using LeaderTrip.Domain.Advice;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

public sealed class AdviceTests
{
    private static CostBreakdown Cost(decimal total) => new()
    {
        Lines = [],
        Subtotal = Money.FromToman(total),
        Miscellaneous = Money.Zero,
        RiskBuffer = Money.Zero,
        Total = Money.FromToman(total),
        PerPerson = Money.FromToman(total / 2),
        Optimistic = Money.FromToman(total * 0.85m),
        Pessimistic = Money.FromToman(total * 1.25m),
    };

    private static DayPlan Day(int index, double drivingHours) => new()
    {
        Index = index,
        Date = new DateOnly(2026, 5, index),
        BaseCityId = "tehran",
        Blocks = [],
        Distance = Distance.FromKilometers(drivingHours * 85),
        DrivingTime = TimeSpan.FromHours(drivingHours),
        Cost = Money.Zero,
    };

    private static AdviceContext Context(
        double drivingHours = 3,
        int month = 5,
        decimal total = 10_000_000,
        decimal budget = 50_000_000,
        double? peak = null,
        Climate climate = Climate.Plain) => new()
        {
            Group = TestData.Group(TestData.Adult("a", 38), TestData.Adult("b", 35, driver: false)),
            Vehicle = TestData.Sedan(),
            Days = [Day(1, drivingHours), Day(2, drivingHours)],
            VisitedPois = [],
            Cost = Cost(total),
            Budget = Money.FromToman(budget),
            DailyDrivingCap = TimeSpan.FromHours(5),
            Month = month,
            Climates = [climate],
            VehicleCount = 1,
            PeakElevationMetres = peak,
        };

    [Fact]
    public void CalmTrip_ProducesNoCriticalAdvice()
    {
        var advice = Advisor.Advise(Context());

        Assert.DoesNotContain(advice, a => a.Level == AdviceLevel.Critical);
    }

    [Fact]
    public void LongDrivingDay_IsWarned()
    {
        var advice = Advisor.Advise(Context(drivingHours: 9));

        Assert.Contains(advice, a => a.Code == "driving.fatigue");
    }

    [Fact]
    public void OverBudget_IsCritical()
    {
        var advice = Advisor.Advise(Context(total: 60_000_000, budget: 50_000_000));

        var over = Assert.Single(advice, a => a.Code == "budget.over");
        Assert.Equal(AdviceLevel.Critical, over.Level);
    }

    /// <summary>
    /// بودجه‌ای که فقط با تخمین میانه جور درمی‌آید، در جاده تنگ می‌شود.
    /// این هشدار همان فاصله را پیش از حرکت نشان می‌دهد.
    /// </summary>
    [Fact]
    public void BudgetThatOnlyFitsTheMedianEstimate_IsWarned()
    {
        var advice = Advisor.Advise(Context(total: 45_000_000, budget: 50_000_000));

        Assert.Contains(advice, a => a.Code == "budget.tight");
        Assert.DoesNotContain(advice, a => a.Code == "budget.over");
    }

    /// <summary>
    /// هشدار گردنه فقط با دادهٔ واقعی ارتفاع ساخته می‌شود. هشدارِ حدسی بدتر از
    /// نبودِ هشدار است: کاربر یا بی‌جهت می‌ترسد یا یاد می‌گیرد نادیده‌اش بگیرد.
    /// </summary>
    [Fact]
    public void HighPass_IsNotWarned_WithoutElevationData()
    {
        var advice = Advisor.Advise(Context(month: 1, peak: null));

        Assert.DoesNotContain(advice, a => a.Code == "route.highPass");
    }

    [Fact]
    public void HighPass_InWinter_IsCritical()
    {
        var advice = Advisor.Advise(Context(month: 1, peak: 2600));

        var pass = Assert.Single(advice, a => a.Code == "route.highPass");
        Assert.Equal(AdviceLevel.Critical, pass.Level);
    }

    [Fact]
    public void HighPass_InSummer_IsOnlyInformational()
    {
        var advice = Advisor.Advise(Context(month: 7, peak: 2600));

        var pass = Assert.Single(advice, a => a.Code == "route.highPass");
        Assert.Equal(AdviceLevel.Info, pass.Level);
    }

    [Fact]
    public void LowRoute_ProducesNoPassWarning()
    {
        var advice = Advisor.Advise(Context(month: 1, peak: 900));

        Assert.DoesNotContain(advice, a => a.Code == "route.highPass");
    }

    [Fact]
    public void SummerInTheDesert_IsCritical()
    {
        var advice = Advisor.Advise(Context(month: 7, climate: Climate.Desert));

        Assert.Contains(advice, a => a.Code == "climate.summerHeat" && a.Level == AdviceLevel.Critical);
    }

    /// <summary>شدیدترین هشدار باید اول بیاید — کسی که فهرست را از پایین بخواند، نمی‌خواند.</summary>
    [Fact]
    public void Advice_IsOrdered_MostSevereFirst()
    {
        var advice = Advisor.Advise(Context(month: 7, climate: Climate.Desert, drivingHours: 9));

        Assert.True(advice.Count >= 2);
        Assert.Equal(AdviceLevel.Critical, advice[0].Level);
    }

    /// <summary>هر هشدار باید کاری را که می‌شود کرد هم بگوید.</summary>
    [Fact]
    public void EveryAdvice_HasActionableDetail()
    {
        var advice = Advisor.Advise(Context(month: 7, climate: Climate.Desert, drivingHours: 9, total: 60_000_000));

        Assert.All(advice, a =>
        {
            Assert.False(string.IsNullOrWhiteSpace(a.Title));
            Assert.True(a.Detail.Length > 30, a.Code);
        });
    }
}

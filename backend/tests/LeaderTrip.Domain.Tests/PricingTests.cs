using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Pricing.Components;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

public class PricingTests
{
    private static PriceBook Prices() => new()
    {
        SubsidizedFuel = new Dictionary<FuelKind, Money>
        {
            [FuelKind.Gasoline] = Money.FromToman(1_500),
            [FuelKind.Diesel] = Money.FromToman(400),
            [FuelKind.Cng] = Money.FromToman(600),
            [FuelKind.Electric] = Money.FromToman(1_000),
        },
        FreeMarketFuel = new Dictionary<FuelKind, Money>
        {
            [FuelKind.Gasoline] = Money.FromToman(3_000),
            [FuelKind.Diesel] = Money.FromToman(1_500),
            [FuelKind.Cng] = Money.FromToman(600),
            [FuelKind.Electric] = Money.FromToman(1_000),
        },
        TollPerKilometer = Money.FromToman(300),
        FreewayShare = 0.45m,
        LodgingPerNight = new Dictionary<TravelStyle, Money>
        {
            [TravelStyle.Budget] = Money.FromToman(400_000),
            [TravelStyle.Balanced] = Money.FromToman(900_000),
            [TravelStyle.Comfort] = Money.FromToman(1_800_000),
            [TravelStyle.Luxury] = Money.FromToman(4_000_000),
        },
        Meals = new Dictionary<TravelStyle, MealPrices>
        {
            [TravelStyle.Budget] = new(Money.FromToman(80_000), Money.FromToman(250_000), Money.FromToman(250_000)),
            [TravelStyle.Balanced] = new(Money.FromToman(150_000), Money.FromToman(450_000), Money.FromToman(450_000)),
            [TravelStyle.Comfort] = new(Money.FromToman(250_000), Money.FromToman(800_000), Money.FromToman(800_000)),
            [TravelStyle.Luxury] = new(Money.FromToman(450_000), Money.FromToman(1_500_000), Money.FromToman(1_500_000)),
        },
        SnackRate = 0.15m,
        MiscRate = new Dictionary<TravelStyle, decimal>
        {
            [TravelStyle.Budget] = 0.05m, [TravelStyle.Balanced] = 0.08m,
            [TravelStyle.Comfort] = 0.10m, [TravelStyle.Luxury] = 0.15m,
        },
        BufferRate = new Dictionary<TravelStyle, decimal>
        {
            [TravelStyle.Budget] = 0.10m, [TravelStyle.Balanced] = 0.12m,
            [TravelStyle.Comfort] = 0.12m, [TravelStyle.Luxury] = 0.15m,
        },
        UpdatedAt = "۱۴۰۴/۰۵",
    };

    private static City City(string id = "isfahan", decimal costIndex = 1m) =>
        new(id, id, "استان", TestData.Isfahan, costIndex, 3, Climate.Plain);

    private static CostContext Context(
        TravelStyle style = TravelStyle.Balanced,
        double km = 1000,
        int vehicles = 1,
        LodgingKind lodging = LodgingKind.Hotel,
        int nights = 2,
        int days = 3,
        TravelGroup? group = null,
        IReadOnlyList<PointOfInterest>? pois = null) => new()
        {
            Group = group ?? TestData.Group(TestData.Adult(), TestData.Adult("b", 33)),
            Vehicle = TestData.Sedan(),
            Prices = Prices(),
            Style = style,
            Lodging = lodging,
            TotalDistance = Distance.FromKilometers(km),
            MountainShare = 0,
            VehicleCount = vehicles,
            SubsidizedFuelShare = 0.6m,
            NightCities = Enumerable.Range(0, nights).Select(_ => City()).ToList(),
            VisitedPois = pois ?? [],
            Days = days,
            Month = 5,
        };

    private static CostCalculator Calculator() => new(
    [
        new FuelCost(), new TollCost(), new LodgingCost(), new MealsCost(),
        new SnacksCost(), new TicketsCost(), new DepreciationCost(),
    ]);

    [Fact]
    public void Total_EqualsSubtotalPlusMiscAndBuffer()
    {
        var cost = Calculator().Calculate(Context());

        Assert.Equal(cost.Subtotal + cost.Miscellaneous + cost.RiskBuffer, cost.Total);
    }

    [Fact]
    public void Subtotal_IsExactlyTheSumOfLines()
    {
        var cost = Calculator().Calculate(Context());

        var summed = cost.Lines.Aggregate(Money.Zero, (s, l) => s + l.Amount);

        // هیچ عدد جادویی‌ای بیرون از اجزا اضافه نمی‌شود
        Assert.Equal(summed, cost.Subtotal);
    }

    [Fact]
    public void EveryLine_CarriesAFormula()
    {
        var cost = Calculator().Calculate(Context());

        Assert.NotEmpty(cost.Lines);
        Assert.All(cost.Lines, line => Assert.False(string.IsNullOrWhiteSpace(line.Formula)));
    }

    [Fact]
    public void EffectiveFuelPrice_SitsBetweenSubsidisedAndFreeMarket()
    {
        var prices = Prices();

        var effective = FuelCost.EffectivePrice(prices, FuelKind.Gasoline, 0.6m);

        Assert.True(effective > prices.SubsidizedFuel[FuelKind.Gasoline]);
        Assert.True(effective < prices.FreeMarketFuel[FuelKind.Gasoline]);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    public void EffectiveFuelPrice_AtTheExtremes_MatchesThatRate(decimal share)
    {
        var prices = Prices();
        var expected = share == 1
            ? prices.SubsidizedFuel[FuelKind.Gasoline]
            : prices.FreeMarketFuel[FuelKind.Gasoline];

        Assert.Equal(expected, FuelCost.EffectivePrice(prices, FuelKind.Gasoline, share));
    }

    [Fact]
    public void LoadFactor_RisesWithPassengers_ButIsCapped()
    {
        Assert.Equal(1.0, FuelCost.LoadFactor(2), 6);
        Assert.Equal(1.09, FuelCost.LoadFactor(5), 6);
        Assert.Equal(1.2, FuelCost.LoadFactor(50), 6);
    }

    [Fact]
    public void Depreciation_ScalesLinearlyWithDistance()
    {
        var single = new DepreciationCost().Calculate(Context(km: 1000)).Amount;
        var doubled = new DepreciationCost().Calculate(Context(km: 2000)).Amount;

        Assert.True(single > Money.Zero);
        Assert.Equal(single * 2m, doubled);
    }

    [Fact]
    public void LuxuryTrip_CostsMoreThanDoubleABudgetOne()
    {
        var cheap = Calculator().Calculate(Context(style: TravelStyle.Budget)).Total;
        var lux = Calculator().Calculate(Context(style: TravelStyle.Luxury)).Total;

        Assert.True(lux > cheap * 2m);
    }

    [Fact]
    public void Camping_NearlyRemovesLodgingCost()
    {
        var hotel = new LodgingCost().Calculate(Context(lodging: LodgingKind.Hotel)).Amount;
        var camp = new LodgingCost().Calculate(Context(lodging: LodgingKind.Camp)).Amount;

        Assert.True(camp < hotel * 0.2m);
    }

    [Fact]
    public void StayingWithFriends_CostsNothing() =>
        Assert.Equal(Money.Zero, new LodgingCost().Calculate(Context(lodging: LodgingKind.Friends)).Amount);

    [Fact]
    public void NoNights_MeansNoLodgingCost()
    {
        var line = new LodgingCost().Calculate(Context(nights: 0));

        Assert.Equal(Money.Zero, line.Amount);
        Assert.Contains("بدون شب", line.Formula, StringComparison.Ordinal);
    }

    [Fact]
    public void Children_PayLessForTicketsMealsAndLodging()
    {
        Assert.Equal(0m, AgeFactors.Ticket(3));
        Assert.Equal(0.5m, AgeFactors.Ticket(10));
        Assert.Equal(0.7m, AgeFactors.Ticket(70));
        Assert.Equal(0.4m, AgeFactors.Meal(4));
        Assert.Equal(0m, AgeFactors.Lodging(2));
    }

    [Fact]
    public void NowruzLodging_IsMoreExpensive() =>
        Assert.True(LodgingCost.SeasonFactor(4, Climate.Plain) > LodgingCost.SeasonFactor(6, Climate.Plain));

    [Fact]
    public void ScenarioRange_BracketsTheTotal()
    {
        var cost = Calculator().Calculate(Context());

        Assert.True(cost.Optimistic < cost.Total);
        Assert.True(cost.Pessimistic > cost.Total);
    }

    [Fact]
    public void MoreVehicles_MeanMoreFuelTollAndDepreciation()
    {
        var one = Calculator().Calculate(Context(vehicles: 1));
        var two = Calculator().Calculate(Context(vehicles: 2));

        Assert.True(two.Total > one.Total);
    }
}

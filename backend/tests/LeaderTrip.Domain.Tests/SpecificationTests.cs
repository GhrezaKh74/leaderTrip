using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Specifications;
using LeaderTrip.Domain.Specifications.Poi;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

public class PoiSpecificationTests
{
    [Fact]
    public void VehicleCanReach_RejectsOffroadPoiForSedan()
    {
        var spec = new VehicleCanReachSpecification(TestData.Sedan());
        var poi = TestData.Poi(requiredVehicle: OffroadCapability.FullOffroad);

        var result = spec.Evaluate(poi);

        Assert.False(result.IsSatisfied);
        Assert.Contains("آفرود", result.Reason, StringComparison.Ordinal);
    }

    [Fact]
    public void VehicleCanReach_AcceptsWhenCapabilityIsEnough()
    {
        var spec = new VehicleCanReachSpecification(TestData.Sedan(OffroadCapability.FullOffroad));

        Assert.True(spec.IsSatisfiedBy(TestData.Poi(requiredVehicle: OffroadCapability.LightDirt)));
    }

    [Fact]
    public void GroupDifficulty_IsCappedByWeakestMember()
    {
        var withToddler = TestData.Group(TestData.Adult(), new Traveler("t", "t", 2, MobilityLevel.Full, false));
        var spec = new GroupCanHandleDifficultySpecification(withToddler);

        Assert.False(spec.IsSatisfiedBy(TestData.Poi(difficulty: Difficulty.Heavy)));
        Assert.True(spec.IsSatisfiedBy(TestData.Poi(difficulty: Difficulty.None)));
    }

    [Fact]
    public void WheelchairUser_BlocksAnythingBeyondLightWalking()
    {
        var group = TestData.Group(new Traveler("w", "w", 40, MobilityLevel.Wheelchair, false));
        var spec = new GroupCanHandleDifficultySpecification(group);

        var result = spec.Evaluate(TestData.Poi(difficulty: Difficulty.Heavy));

        Assert.False(result.IsSatisfied);
        Assert.Contains("ویلچر", result.Reason, StringComparison.Ordinal);
    }

    [Fact]
    public void HomeCity_IsExcludedOnMultiDayTripsButAllowedOnDayTrips()
    {
        var poi = TestData.Poi(cityId: "tehran");

        Assert.False(new NotInHomeCitySpecification("tehran", 3).IsSatisfiedBy(poi));
        Assert.True(new NotInHomeCitySpecification("tehran", 1).IsSatisfiedBy(poi));
    }

    [Fact]
    public void Composite_ReportsTheFirstFailingReason()
    {
        var spec = Spec.All(
            new NotExcludedSpecification(new HashSet<string>()),
            new MinimumAgeSpecification(TestData.Group(TestData.Child())),
            new VehicleCanReachSpecification(TestData.Sedan()));

        var poi = TestData.Poi(minimumAge: 16, requiredVehicle: OffroadCapability.FullOffroad);
        var result = spec.Evaluate(poi);

        // سن جلوتر از خودرو سنجیده می‌شود، پس دلیلِ همان باید برگردد
        Assert.False(result.IsSatisfied);
        Assert.Contains("سن", result.Reason, StringComparison.Ordinal);
    }

    [Fact]
    public void Composite_WithNoRules_AcceptsEverything() =>
        Assert.True(Spec.All<PointOfInterest>().IsSatisfiedBy(TestData.Poi()));

    [Fact]
    public void WithinRadius_UsesStraightLineDistance()
    {
        var spec = new WithinRadiusSpecification(TestData.Tehran, Distance.FromKilometers(100));

        Assert.True(spec.IsSatisfiedBy(TestData.Poi(location: TestData.Tehran)));
        Assert.False(spec.IsSatisfiedBy(TestData.Poi(location: TestData.Isfahan)));
    }

    [Fact]
    public void OutOfSeason_IsRejected()
    {
        var summerOnly = new HashSet<int> { 6, 7, 8 };
        var spec = new InSeasonSpecification(1);

        Assert.False(spec.IsSatisfiedBy(TestData.Poi(bestMonths: summerOnly)));
    }
}

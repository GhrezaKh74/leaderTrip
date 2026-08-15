using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

public class TravelPlannerTests
{
    private static TravelPlanner Estimating() => new(NoRoadDistanceProvider.Instance);

    [Fact]
    public void WithoutRoutingService_FallsBackToDetourEstimate()
    {
        var leg = Estimating().Plan(TestData.Tehran, TestData.Isfahan, Terrain.Plain, TestData.Sedan());

        Assert.Equal(DistanceSource.Estimated, leg.Source);
        Assert.Equal(
            TestData.Tehran.StraightLineTo(TestData.Isfahan).Kilometers * TravelPlanner.DetourFactor(Terrain.Plain),
            leg.Road.Kilometers,
            6);
    }

    [Fact]
    public void WithRoutingService_UsesRealRoadDistance()
    {
        var planner = new TravelPlanner(new StubProvider(440, TimeSpan.FromMinutes(300)));

        var leg = planner.Plan(TestData.Tehran, TestData.Isfahan, Terrain.Plain, TestData.Sedan());

        Assert.Equal(DistanceSource.Routed, leg.Source);
        Assert.Equal(440, leg.Road.Kilometers, 6);
        Assert.Equal(300, leg.Duration.TotalMinutes, 6);
    }

    [Fact]
    public void RealDuration_StillTakesVehicleAndGroupPaceIntoAccount()
    {
        var planner = new TravelPlanner(new StubProvider(440, TimeSpan.FromMinutes(300)));
        var bus = new Vehicle("bus", "اتوبوس", VehicleClass.Bus, FuelKind.Diesel, 30, 44,
            OffroadCapability.Paved, 0.75, 4000m, 3m);

        var byBus = planner.Plan(TestData.Tehran, TestData.Isfahan, Terrain.Plain, bus);
        var withKids = planner.Plan(TestData.Tehran, TestData.Isfahan, Terrain.Plain, TestData.Sedan(), 0.9);

        // زمان سرویس مسیریابی برای خودروی معمولی در جادهٔ خلوت است
        Assert.True(byBus.Duration.TotalMinutes > 300);
        Assert.True(withKids.Duration.TotalMinutes > 300);
    }

    [Fact]
    public void MountainTerrain_IsLongerAndSlowerThanFreeway()
    {
        Assert.True(TravelPlanner.DetourFactor(Terrain.Mountain) > TravelPlanner.DetourFactor(Terrain.Freeway));
        Assert.True(TravelPlanner.TerrainSpeedFactor(Terrain.Mountain) < TravelPlanner.TerrainSpeedFactor(Terrain.Freeway));
    }

    [Fact]
    public void CrossingFromCaspianToPlateau_IsTreatedAsMountain()
    {
        var terrain = TravelPlanner.InferTerrain(Climate.Caspian, Climate.Plain, Distance.FromKilometers(120));

        Assert.Equal(Terrain.Mountain, terrain);
    }

    [Fact]
    public void ShortHopWithinTheSameClimate_IsNotMountain() =>
        Assert.Equal(Terrain.Plain, TravelPlanner.InferTerrain(Climate.Plain, Climate.Plain, Distance.FromKilometers(50)));

    private sealed class StubProvider(double km, TimeSpan duration) : IRoadDistanceProvider
    {
        public RoadMeasurement? TryGet(Coordinate origin, Coordinate destination) =>
            new(Distance.FromKilometers(km), duration);
    }
}

public class ItinerarySelectorTests
{
    private static readonly Coordinate Near = Coordinate.Create(35.8, 51.5).Value;
    private static readonly Coordinate Mid = Coordinate.Create(36.2, 51.8).Value;
    private static readonly Coordinate Far = Coordinate.Create(29.6, 52.5).Value;

    private static SelectionRequest Request(
        int days = 3,
        double drivingCapHours = 5,
        bool roundTrip = true,
        params string[] pinned) => new()
        {
            Origin = TestData.Tehran,
            OriginClimate = Climate.Plain,
            Vehicle = TestData.Sedan(),
            Days = days,
            DailyDrivingCap = TimeSpan.FromHours(drivingCapHours),
            UsableHoursPerDay = TimeSpan.FromHours(10),
            ReturnsToOrigin = roundTrip,
            Pace = 1,
            VisitStretch = 1,
            PinnedPoiIds = new HashSet<string>(pinned, StringComparer.Ordinal),
            CityClimates = new Dictionary<string, Climate> { ["tehran"] = Climate.Plain },
        };

    private static ItinerarySelector Selector() =>
        new(new TravelPlanner(NoRoadDistanceProvider.Instance));

    [Fact]
    public void EmptyCandidateList_YieldsEmptyRoute() =>
        Assert.Empty(Selector().Select([], Request()));

    [Fact]
    public void PrefersNearbyValue_OverDistantValue()
    {
        var candidates = new List<ScoredPoi>
        {
            new(TestData.Poi("near", location: Near), 100),
            new(TestData.Poi("far", location: Far), 110),
        };

        var route = Selector().Select(candidates, Request(days: 1, drivingCapHours: 3));

        // امتیاز دورتر کمی بیشتر است، ولی رسیدن به آن ساعت‌ها بیشتر طول می‌کشد
        Assert.Contains(route, p => p.Id == "near");
        Assert.DoesNotContain(route, p => p.Id == "far");
    }

    [Fact]
    public void RespectsDrivingBudget_AndDropsWhatDoesNotFit()
    {
        var candidates = Enumerable.Range(0, 12)
            .Select(i => new ScoredPoi(TestData.Poi($"p{i}", location: Mid, visitMinutes: 120), 100))
            .ToList();

        var route = Selector().Select(candidates, Request(days: 1, drivingCapHours: 2));

        Assert.True(route.Count < candidates.Count);
    }

    [Fact]
    public void PinnedPoi_IsAlwaysIncluded()
    {
        var candidates = new List<ScoredPoi>
        {
            new(TestData.Poi("boring", location: Far, rating: 1), 5),
            new(TestData.Poi("nice", location: Near), 100),
        };

        var route = Selector().Select(candidates, Request(pinned: "boring"));

        Assert.Contains(route, p => p.Id == "boring");
    }

    [Fact]
    public void MoreDays_AllowMoreVisits()
    {
        var candidates = Enumerable.Range(0, 10)
            .Select(i => new ScoredPoi(TestData.Poi($"p{i}", location: Mid), 100))
            .ToList();

        var shortTrip = Selector().Select(candidates, Request(days: 1));
        var longTrip = Selector().Select(candidates, Request(days: 5));

        Assert.True(longTrip.Count >= shortTrip.Count);
    }

    [Fact]
    public void RouteHasNoDuplicates()
    {
        var candidates = Enumerable.Range(0, 8)
            .Select(i => new ScoredPoi(TestData.Poi($"p{i}", location: Near), 100))
            .ToList();

        var route = Selector().Select(candidates, Request());

        Assert.Equal(route.Count, route.DistinctBy(p => p.Id).Count());
    }

    [Fact]
    public void OneWayTrip_CanReachFurtherThanARoundTrip()
    {
        var candidates = new List<ScoredPoi> { new(TestData.Poi("far", location: Far), 100) };

        var oneWay = Selector().Select(candidates, Request(days: 2, drivingCapHours: 6, roundTrip: false));
        var roundTrip = Selector().Select(candidates, Request(days: 2, drivingCapHours: 6, roundTrip: true));

        Assert.True(oneWay.Count >= roundTrip.Count);
    }
}

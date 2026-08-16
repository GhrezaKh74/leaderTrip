using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Tests;

/// <summary>سازنده‌های کوتاه برای تست — تا هر تست فقط چیزی را بگوید که برایش مهم است.</summary>
internal static class TestData
{
    public static Coordinate Tehran { get; } = Coordinate.Create(35.6892, 51.3890).Value;

    public static Coordinate Isfahan { get; } = Coordinate.Create(32.6539, 51.6660).Value;

    public static readonly IReadOnlySet<int> AllMonths =
        new HashSet<int>(Enumerable.Range(1, 12));

    public static PointOfInterest Poi(
        string id = "poi",
        PoiCategory category = PoiCategory.Historical,
        double rating = 4,
        Difficulty difficulty = Difficulty.None,
        int minimumAge = 0,
        bool kidFriendly = true,
        bool seniorFriendly = true,
        bool indoor = false,
        OffroadCapability requiredVehicle = OffroadCapability.Paved,
        decimal ticket = 0,
        Coordinate? location = null,
        IReadOnlySet<int>? bestMonths = null,
        int visitMinutes = 60,
        string cityId = "tehran",
        bool nightSuitable = false,
        TimeSpan? opensAt = null,
        TimeSpan? closesAt = null) =>
        new(
            id, id, cityId, location ?? Tehran, category, rating,
            TimeSpan.FromMinutes(visitMinutes), Money.FromToman(ticket),
            bestMonths ?? AllMonths, indoor, difficulty, minimumAge,
            kidFriendly, seniorFriendly, requiredVehicle, "توضیح",
            nightSuitable, tags: null, opensAt: opensAt, closesAt: closesAt);

    public static Vehicle Sedan(OffroadCapability offroad = OffroadCapability.Paved) =>
        new("sedan", "سواری", VehicleClass.Sedan, FuelKind.Gasoline, 7.2, 5, offroad, 1.0, 900m, 1m);

    public static Traveler Adult(string id = "a", int age = 35, bool driver = true) =>
        new(id, id, age, MobilityLevel.Full, driver);

    public static Traveler Child(string id = "c", int age = 8) =>
        new(id, id, age, MobilityLevel.Full, false);

    public static TravelGroup Group(params Traveler[] travelers) =>
        TravelGroup.Create(travelers.Length == 0 ? [Adult()] : travelers).Value;
}

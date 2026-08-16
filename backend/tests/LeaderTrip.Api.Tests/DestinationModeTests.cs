using System.Net.Http.Json;
using System.Text.Json;

namespace LeaderTrip.Api.Tests;

/// <summary>دو معنای مقصد، با دادهٔ واقعی: اقامتی برمی‌گردد، مسیرگردی می‌رسد.</summary>
public sealed class DestinationModeTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public DestinationModeTests(ApiFactory factory) => _factory = factory;

    private static object Request(string mode, bool roundTrip) => new
    {
        originCityId = "tehran",
        destinationCityId = "isfahan",
        destinationMode = mode,
        startDate = "2026-09-01",
        days = 3,
        radiusKm = 100,
        budgetToman = 80_000_000,
        travelers = new[] { new { id = "t1", name = "لیدر", age = 30, mobility = "Full", isDriver = true } },
        vehicleId = "sedan-206",
        vehicleCount = 1,
        maxDrivingHoursPerDay = 7,
        dayStartHour = 8,
        dayEndHour = 21,
        style = "Balanced",
        lodging = "Hotel",
        interests = new[] { "Historical" },
        roundTrip,
        pinnedPoiIds = Array.Empty<string>(),
        excludedPoiIds = Array.Empty<string>(),
    };

    private async Task<List<string>> BaseCitiesAsync(object request)
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(new Uri("/api/trips/plan", UriKind.Relative), request);

        response.EnsureSuccessStatusCode();

        using var plan = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        return [.. plan.RootElement.GetProperty("days").EnumerateArray()
            .Select(day => day.GetProperty("baseCityId").GetString()!)];
    }

    /// <summary>سفر اقامتی: شب‌ها پایگاه مقصد است و روز آخر برگشت به مبدأ.</summary>
    [Fact]
    public async Task StayMode_BasesAtDestination_AndReturnsHome()
    {
        var baseCities = await BaseCitiesAsync(Request("Stay", roundTrip: true));

        Assert.Equal("tehran", baseCities[^1]);
        Assert.Contains("isfahan", baseCities[..^1]);
    }

    /// <summary>سفر اقامتیِ بی‌برگشت: سفر در خود مقصد تمام می‌شود.</summary>
    [Fact]
    public async Task StayMode_WithoutReturn_EndsAtDestination()
    {
        var baseCities = await BaseCitiesAsync(Request("Stay", roundTrip: false));

        Assert.Equal("isfahan", baseCities[^1]);
    }

    /// <summary>مسیرگردی: یک‌سویه است — حتی با پرچم برگشت — و روز آخر به مقصد می‌رسد.</summary>
    [Fact]
    public async Task CorridorMode_IgnoresRoundTrip_AndEndsAtDestination()
    {
        var baseCities = await BaseCitiesAsync(Request("Corridor", roundTrip: true));

        Assert.Equal("isfahan", baseCities[^1]);
    }
}

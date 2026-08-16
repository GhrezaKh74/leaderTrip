using System.Net.Http.Json;
using System.Text.Json;

namespace LeaderTrip.Api.Tests;

/// <summary>کیفیت برنامه با دادهٔ واقعی: جهت‌داری سفر کوتاه و زنده‌بودن شب.</summary>
public sealed class PlanQualityTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public PlanQualityTests(ApiFactory factory) => _factory = factory;

    private static object Request(int days, double radiusKm, int dayEndHour = 21) => new
    {
        originCityId = "tehran",
        destinationCityId = (string?)null,
        startDate = "2026-09-01",
        days,
        radiusKm,
        budgetToman = 80_000_000,
        travelers = new[] { new { id = "t1", name = "لیدر", age = 30, mobility = "Full", isDriver = true } },
        vehicleId = "sedan-206",
        vehicleCount = 1,
        maxDrivingHoursPerDay = 5,
        dayStartHour = 8,
        dayEndHour,
        style = "Balanced",
        lodging = "Hotel",
        interests = Array.Empty<string>(),
        roundTrip = true,
        pinnedPoiIds = Array.Empty<string>(),
        excludedPoiIds = Array.Empty<string>(),
    };

    private async Task<(JsonDocument Plan, Dictionary<string, string> CityOfPoi)> PlanAsync(object request)
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(new Uri("/api/trips/plan", UriKind.Relative), request);

        response.EnsureSuccessStatusCode();

        var plan = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        var poisResponse = await client.GetAsync(new Uri("/api/pois", UriKind.Relative));

        poisResponse.EnsureSuccessStatusCode();

        using var pois = JsonDocument.Parse(await poisResponse.Content.ReadAsStringAsync());
        var cityOf = pois.RootElement.GetProperty("items").EnumerateArray()
            .ToDictionary(
                p => p.GetProperty("id").GetString()!,
                p => p.GetProperty("cityId").GetString()!,
                StringComparer.Ordinal);

        return (plan, cityOf);
    }

    private static List<string> VisitedPoiIds(JsonDocument plan) =>
        [.. plan.RootElement.GetProperty("days").EnumerateArray()
            .SelectMany(d => d.GetProperty("blocks").EnumerateArray())
            .Where(b => b.GetProperty("kind").GetString() == "Visit")
            .Select(b => b.GetProperty("poiId").GetString())
            .Where(id => id is not null)
            .Cast<string>()];

    /// <summary>
    /// رگرسیون زیگزاگ: سفر آخر هفته نباید قم (جنوب) و قزوین (شمال غربی) را با
    /// هم بردارد — این یعنی گذر دوباره از روی تهران وسط یک سفر دوروزه.
    /// </summary>
    [Fact]
    public async Task WeekendLoop_DoesNotMixOppositeDirections()
    {
        var (plan, cityOf) = await PlanAsync(Request(days: 2, radiusKm: 150));

        using (plan)
        {
            var cities = VisitedPoiIds(plan)
                .Select(id => cityOf.GetValueOrDefault(id))
                .ToHashSet(StringComparer.Ordinal);

            Assert.False(
                cities.Contains("qom") && cities.Contains("qazvin"),
                "سفر دوروزه نباید دو جهت مخالف را قاطی کند");
        }
    }

    /// <summary>شبِ سفر با روزِ بلند زنده است: بعد از شام هم بازدید هست.</summary>
    [Fact]
    public async Task LongDay_HasEveningActivity()
    {
        var (plan, _) = await PlanAsync(new
        {
            originCityId = "tehran",
            destinationCityId = "isfahan",
            destinationMode = "Stay",
            startDate = "2026-09-01",
            days = 3,
            radiusKm = 60,
            budgetToman = 80_000_000,
            travelers = new[] { new { id = "t1", name = "لیدر", age = 30, mobility = "Full", isDriver = true } },
            vehicleId = "sedan-206",
            vehicleCount = 1,
            maxDrivingHoursPerDay = 7,
            dayStartHour = 8,
            dayEndHour = 23,
            style = "Balanced",
            lodging = "Hotel",
            interests = Array.Empty<string>(),
            roundTrip = true,
            pinnedPoiIds = Array.Empty<string>(),
            excludedPoiIds = Array.Empty<string>(),
        });

        using (plan)
        {
            // در روزی که شب در اصفهان می‌گذرد، بعد از ساعت ۲۰ هم بازدیدی هست —
            // پل‌ها و میدان، شب زنده‌اند و برنامه نباید ساعت پنج «تمام شود».
            bool hasEveningVisit = plan.RootElement.GetProperty("days").EnumerateArray()
                .SelectMany(d => d.GetProperty("blocks").EnumerateArray())
                .Any(b => b.GetProperty("kind").GetString() == "Visit"
                    && string.CompareOrdinal(b.GetProperty("startsAt").GetString(), "20:00") >= 0);

            Assert.True(hasEveningVisit, "با روز بلند، بعد از شام هم باید برنامه باشد");
        }
    }
}

using System.Net.Http.Json;
using System.Text.Json;

namespace LeaderTrip.Api.Tests;

/// <summary>توقف دلخواه: جایی که در دیتاست نیست ولی کاربر روی نقشه انتخابش کرده.</summary>
public sealed class CustomStopTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public CustomStopTests(ApiFactory factory) => _factory = factory;

    private static object Request(object[] customStops) => new
    {
        originCityId = "tehran",
        destinationCityId = (string?)null,
        startDate = "2026-09-01",
        days = 2,
        radiusKm = 300,
        budgetToman = 80_000_000,
        travelers = new[] { new { id = "t1", name = "لیدر", age = 30, mobility = "Full", isDriver = true } },
        vehicleId = "sedan-206",
        vehicleCount = 1,
        maxDrivingHoursPerDay = 6,
        dayStartHour = 8,
        dayEndHour = 21,
        style = "Balanced",
        lodging = "Hotel",
        interests = Array.Empty<string>(),
        roundTrip = true,
        pinnedPoiIds = Array.Empty<string>(),
        excludedPoiIds = Array.Empty<string>(),
        customStops,
    };

    /// <summary>
    /// توقف دلخواه مثل سنجاق است: حتماً در برنامه می‌آید — با همان عنوانی که
    /// کاربر انتخاب کرده.
    /// </summary>
    [Fact]
    public async Task CustomStop_IsScheduled_WithUserTitle()
    {
        using var client = _factory.CreateClient();

        // باغ گیلاس دلخواه نزدیک کرج — عمداً جایی که در دیتاست نیست.
        var request = Request([
            new { id = "custom-bagh", name = "باغ گیلاس عمو", lat = 35.83, lng = 50.95, visitMinutes = 45 },
        ]);

        var response = await client.PostAsJsonAsync(new Uri("/api/trips/plan", UriKind.Relative), request);

        response.EnsureSuccessStatusCode();

        using var plan = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        var visitTitles = plan.RootElement.GetProperty("days").EnumerateArray()
            .SelectMany(d => d.GetProperty("blocks").EnumerateArray())
            .Where(b => b.GetProperty("kind").GetString() == "Visit")
            .Select(b => b.GetProperty("title").GetString())
            .ToList();

        Assert.Contains("باغ گیلاس عمو", visitTitles);

        // و در «جانشد»ها هم نیست — یعنی واقعاً برنامه‌ریزی شده، نه فقط پذیرفته.
        var unscheduled = plan.RootElement.GetProperty("unscheduledPoiIds").EnumerateArray()
            .Select(e => e.GetString())
            .ToList();

        Assert.DoesNotContain("custom-bagh", unscheduled);
    }

    /// <summary>مختصات بیرون از ایران با پیام روشن رد می‌شود، نه با برنامهٔ خراب.</summary>
    [Fact]
    public async Task CustomStop_OutsideIran_IsRejected()
    {
        using var client = _factory.CreateClient();

        var request = Request([
            new { id = "custom-paris", name = "پاریس", lat = 48.85, lng = 2.35, visitMinutes = 60 },
        ]);

        var response = await client.PostAsJsonAsync(new Uri("/api/trips/plan", UriKind.Relative), request);

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }
}

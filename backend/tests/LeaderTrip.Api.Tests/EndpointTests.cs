using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace LeaderTrip.Api.Tests;

public sealed class EndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public EndpointTests(ApiFactory factory) => _factory = factory;

    private static JsonObject SampleTrip => new()
    {
        ["originCityId"] = "tehran",
        ["startDate"] = "2026-05-02",
        ["days"] = 3,
        ["radiusKm"] = 450,
        ["vehicleId"] = "sedan-206",
        ["budgetToman"] = 60_000_000,
        ["interests"] = new JsonArray("Historical", "Nature"),
        ["travelers"] = new JsonArray(
            new JsonObject { ["id"] = "a", ["name"] = "علی", ["age"] = 38, ["mobility"] = "Full", ["isDriver"] = true },
            new JsonObject { ["id"] = "b", ["name"] = "مریم", ["age"] = 35, ["mobility"] = "Full", ["isDriver"] = false }),
    };

    [Fact]
    public async Task Health_IsPublic()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(new Uri("/health", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Reference_Returns_CitiesVehiclesAndPrices()
    {
        using var client = _factory.CreateClient();

        var payload = await client.GetFromJsonAsync<JsonObject>(new Uri("/api/reference", UriKind.Relative));

        Assert.NotNull(payload);
        Assert.Equal(85, payload["cities"]!.AsArray().Count);
        Assert.Equal(15, payload["vehicles"]!.AsArray().Count);
        Assert.False(string.IsNullOrWhiteSpace(payload["prices"]!["updatedAt"]!.GetValue<string>()));
    }

    /// <summary>
    /// شمارشی‌ها باید با نام منتشر شوند. عددِ خام یعنی مصرف‌کننده به ترتیب تعریف
    /// enum وابسته می‌شود و اضافه‌شدن یک مقدار وسط فهرست، بی‌صدا همه‌چیز را
    /// جابه‌جا می‌کند.
    /// </summary>
    [Fact]
    public async Task Enums_AreSerialized_AsNames()
    {
        using var client = _factory.CreateClient();

        var payload = await client.GetFromJsonAsync<JsonObject>(new Uri("/api/reference", UriKind.Relative));
        var city = payload!["cities"]!.AsArray()[0]!;

        Assert.Equal(JsonValueKind.String, city["climate"]!.GetValue<JsonElement>().ValueKind);
    }

    [Fact]
    public async Task Pois_CanBeFiltered_ByCity()
    {
        using var client = _factory.CreateClient();

        var all = await client.GetFromJsonAsync<JsonObject>(new Uri("/api/pois", UriKind.Relative));
        var yazd = await client.GetFromJsonAsync<JsonObject>(new Uri("/api/pois?cityId=yazd", UriKind.Relative));

        Assert.Equal(143, all!["total"]!.GetValue<int>());
        Assert.InRange(yazd!["total"]!.GetValue<int>(), 1, 142);
        Assert.All(
            yazd["items"]!.AsArray(),
            item => Assert.Equal("yazd", item!["cityId"]!.GetValue<string>()));
    }

    [Fact]
    public async Task Plan_Returns_ScheduleAndTraceableCost()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync(new Uri("/api/trips/plan", UriKind.Relative), SampleTrip);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var plan = await response.Content.ReadFromJsonAsync<JsonObject>();

        Assert.Equal(3, plan!["days"]!.AsArray().Count);
        Assert.True(plan["visitCount"]!.GetValue<int>() > 0);

        // هر قلم هزینه باید فرمول خودش را همراه داشته باشد — همان ادعای «قابل
        // ردیابی تا آخرین ریال» که کل محصول روی آن بنا شده.
        Assert.All(
            plan["cost"]!["lines"]!.AsArray(),
            line => Assert.False(string.IsNullOrWhiteSpace(line!["formula"]!.GetValue<string>())));
    }

    [Fact]
    public async Task UnknownCity_Returns404_WithMachineReadableCode()
    {
        using var client = _factory.CreateClient();

        var request = SampleTrip;
        request["originCityId"] = "atlantis";

        using var response = await client.PostAsJsonAsync(new Uri("/api/trips/plan", UriKind.Relative), request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<JsonObject>();

        Assert.Equal("city.notFound", problem!["code"]!.GetValue<string>());
    }

    [Fact]
    public async Task InvalidInput_Returns400()
    {
        using var client = _factory.CreateClient();

        var request = SampleTrip;
        request["days"] = 0;

        using var response = await client.PostAsJsonAsync(new Uri("/api/trips/plan", UriKind.Relative), request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_RejectsMissingKey()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            new Uri("/api/admin/prices", UriKind.Relative),
            new { payload = "{}", updatedAt = "۱۴۰۴/۰۶" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_RejectsWrongKey()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", "not-the-key");

        using var response = await client.PostAsJsonAsync(
            new Uri("/api/admin/prices", UriKind.Relative),
            new { payload = "{}", updatedAt = "۱۴۰۴/۰۶" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// بدون پایگاه داده جایی برای نوشتن نیست. مهم این است که صریح رد شود:
    /// پذیرفتن درخواست و بی‌صدا دورانداختنش، کاربر را به این باور می‌رساند که
    /// قیمت‌ها به‌روز شده‌اند.
    /// </summary>
    [Fact]
    public async Task AdminEndpoint_WithValidKey_ReportsReadOnlyInstance()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Admin-Key", ApiFactory.AdminKey);

        using var response = await client.PostAsJsonAsync(
            new Uri("/api/admin/prices", UriKind.Relative),
            new { payload = "{}", updatedAt = "۱۴۰۴/۰۶" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<JsonObject>();

        Assert.Equal("priceBook.readOnly", problem!["code"]!.GetValue<string>());
    }

    [Fact]
    public async Task OpenApiDocument_IsServed_InDevelopment()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(new Uri("/openapi/v1.json", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

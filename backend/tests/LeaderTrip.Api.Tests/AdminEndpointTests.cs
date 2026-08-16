using System.Net;
using System.Net.Http.Json;

namespace LeaderTrip.Api.Tests;

public sealed class AdminEndpointTests : IClassFixture<ApiFactory>
{
    private static readonly byte[] JpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];

    private readonly ApiFactory _factory;

    public AdminEndpointTests(ApiFactory factory) => _factory = factory;

    private sealed record Overview(
        string StorageMode,
        int Cities,
        int Pois,
        int Vehicles,
        string PricesUpdatedAt,
        int PhotoCount,
        long PhotoBytes,
        bool RoutingEnabled,
        bool WeatherEnabled,
        bool DiscoveryEnabled,
        int RequestsPerMinute,
        int PlanRequestsPerMinute);

    private sealed record Inventory(List<Item> Items, int TotalCount, long TotalBytes);

    private sealed record Item(string Id, long Bytes, DateTimeOffset CreatedAt);

    private HttpClient AdminClient()
    {
        var client = _factory.CreateClient();

        client.DefaultRequestHeaders.Add("X-Admin-Key", ApiFactory.AdminKey);

        return client;
    }

    [Fact]
    public async Task Overview_WithoutKey_Is401()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/admin/overview", UriKind.Relative));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Overview_ReportsSeedModeAndRealCounts()
    {
        using var client = AdminClient();

        var overview = await client.GetFromJsonAsync<Overview>(
            new Uri("/api/admin/overview", UriKind.Relative));

        Assert.NotNull(overview);
        Assert.Equal("Seed", overview.StorageMode);
        Assert.True(overview.Cities > 0);
        Assert.True(overview.Pois > 0);
        Assert.True(overview.Vehicles > 0);
        Assert.NotEmpty(overview.PricesUpdatedAt);
        Assert.False(overview.RoutingEnabled);
        Assert.False(overview.WeatherEnabled);
    }

    /// <summary>چرخهٔ کامل مدیریت عکس: بارگذاری، دیدن در فهرست، حذف، و ۴۰۴ پس از حذف.</summary>
    [Fact]
    public async Task PhotoLifecycle_UploadListDelete()
    {
        using var client = AdminClient();
        byte[] payload = [.. JpegHeader, .. new byte[300]];

        var file = new ByteArrayContent(payload);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        using var form = new MultipartFormDataContent { { file, "photo", "x.jpg" } };

        var upload = await client.PostAsync(new Uri("/api/photos", UriKind.Relative), form);
        var uploaded = await upload.Content.ReadFromJsonAsync<Item>();

        Assert.NotNull(uploaded);

        var inventory = await client.GetFromJsonAsync<Inventory>(
            new Uri("/api/admin/photos", UriKind.Relative));

        Assert.NotNull(inventory);
        Assert.Contains(inventory.Items, item => item.Id == uploaded.Id);
        Assert.True(inventory.TotalBytes >= payload.Length);

        var delete = await client.DeleteAsync(new Uri($"/api/admin/photos/{uploaded.Id}", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var afterDelete = await client.GetAsync(new Uri($"/api/photos/{uploaded.Id}", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);

        var deleteAgain = await client.DeleteAsync(new Uri($"/api/admin/photos/{uploaded.Id}", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, deleteAgain.StatusCode);
    }

    [Fact]
    public async Task PhotoDelete_WithoutKey_Is401()
    {
        using var client = _factory.CreateClient();

        var response = await client.DeleteAsync(
            new Uri($"/api/admin/photos/{new string('a', 32)}.jpg", UriKind.Relative));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}

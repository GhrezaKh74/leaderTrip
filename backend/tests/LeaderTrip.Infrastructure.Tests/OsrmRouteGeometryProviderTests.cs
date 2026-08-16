using System.Net;
using System.Text;
using LeaderTrip.Domain.ValueObjects;
using LeaderTrip.Infrastructure.External;
using LeaderTrip.Infrastructure.External.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.Tests;

public sealed class OsrmRouteGeometryProviderTests
{
    private static readonly Coordinate Tehran = Coordinate.Create(35.6892, 51.389).Value;
    private static readonly Coordinate Qazvin = Coordinate.Create(36.2688, 50.0041).Value;

    private const string SampleResponse = """
        {"code":"Ok","routes":[{"geometry":{"type":"LineString",
        "coordinates":[[51.389,35.6892],[50.9,36.0],[50.0041,36.2688]]}}]}
        """;

    private static OsrmRouteGeometryProvider Build(CountingHandler handler, bool enabled = true)
    {
        var options = Options.Create(new RoutingOptions { Enabled = enabled });

        return new OsrmRouteGeometryProvider(
            new HttpClient(handler) { BaseAddress = new Uri("https://osrm.test/") },
            new MemoryCache(new MemoryCacheOptions()),
            options,
            NullLogger<OsrmRouteGeometryProvider>.Instance);
    }

    [Fact]
    public async Task ParsesGeoJson_IntoLatLngOrder()
    {
        var handler = new CountingHandler(HttpStatusCode.OK, SampleResponse);
        var provider = Build(handler);

        var path = await provider.GetPathAsync([Tehran, Qazvin], CancellationToken.None);

        Assert.Equal(3, path.Count);
        // GeoJSON طول‌وعرض است؛ خروجی باید عرض‌وطولِ درست باشد
        Assert.Equal(35.6892, path[0].Latitude, 4);
        Assert.Equal(51.389, path[0].Longitude, 4);
        Assert.Equal(36.2688, path[2].Latitude, 4);
    }

    /// <summary>هندسهٔ یک مسیر عوض نمی‌شود؛ درخواست دوم باید از کش بیاید.</summary>
    [Fact]
    public async Task SecondCall_ComesFromCache()
    {
        var handler = new CountingHandler(HttpStatusCode.OK, SampleResponse);
        var provider = Build(handler);

        _ = await provider.GetPathAsync([Tehran, Qazvin], CancellationToken.None);
        _ = await provider.GetPathAsync([Tehran, Qazvin], CancellationToken.None);

        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task ServerError_MeansEmptyPath_NotException()
    {
        var handler = new CountingHandler(HttpStatusCode.TooManyRequests, "busy");
        var provider = Build(handler);

        Assert.Empty(await provider.GetPathAsync([Tehran, Qazvin], CancellationToken.None));
    }

    /// <summary>شکست کش نمی‌شود: قطعی گذرا نباید ساعت‌ها «خط مستقیم» بسازد.</summary>
    [Fact]
    public async Task FailureIsNotCached_NextCallRetries()
    {
        var handler = new CountingHandler(HttpStatusCode.TooManyRequests, "busy");
        var provider = Build(handler);

        _ = await provider.GetPathAsync([Tehran, Qazvin], CancellationToken.None);
        _ = await provider.GetPathAsync([Tehran, Qazvin], CancellationToken.None);

        Assert.Equal(2, handler.Calls);
    }

    [Fact]
    public async Task Disabled_MeansEmpty_WithoutAnyRequest()
    {
        var handler = new CountingHandler(HttpStatusCode.OK, SampleResponse);
        var provider = Build(handler, enabled: false);

        Assert.Empty(await provider.GetPathAsync([Tehran, Qazvin], CancellationToken.None));
        Assert.Equal(0, handler.Calls);
    }

    private sealed class CountingHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _body;

        public CountingHandler(HttpStatusCode status, string body)
        {
            _status = status;
            _body = body;
        }

        public int Calls { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Calls += 1;

            return Task.FromResult(new HttpResponseMessage(_status)
            {
                Content = new StringContent(_body, Encoding.UTF8, "application/json"),
            });
        }
    }
}

using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.ValueObjects;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.External.Routing;

/// <summary>هندسهٔ مسیر از سرویس <c>/route</c> OSRM.</summary>
/// <remarks>
/// <para>
/// همان سرور و همان تنظیماتِ <see cref="OsrmRoadDistanceProvider"/>؛ فقط
/// سرویس فرق دارد: <c>/table</c> عدد می‌دهد، <c>/route</c> شکل. خروجی GeoJSON
/// گرفته می‌شود که مختصات صریح دارد — polyline فشردهٔ OSRM یک فرمت دیگر برای
/// اشتباه‌کردن است و صرفه‌جویی‌اش برای چند صد نقطه اهمیتی ندارد.
/// </para>
/// <para>
/// نتیجه کش می‌شود: هندسهٔ جاده بین توقف‌های یک برنامه با هر بار بازکردن تب
/// نقشه عوض نمی‌شود، و سهمیهٔ سرور عمومی هم محدود است.
/// </para>
/// <para>
/// هر شکست — سرور، شبکه، پاسخ ناmeaning — فهرست خالی است، نه استثنا: نقشه
/// بدون هندسه هم کار می‌کند، فقط خط مستقیم می‌کشد و همان را برچسب می‌زند.
/// </para>
/// </remarks>
internal sealed partial class OsrmRouteGeometryProvider : IRouteGeometryProvider
{
    /// <summary>سقف نقاط ورودی در یک درخواست — سرور عمومی سختگیر است.</summary>
    private const int MaxWaypoints = 100;

    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly RoutingOptions _options;
    private readonly ILogger<OsrmRouteGeometryProvider> _logger;

    public OsrmRouteGeometryProvider(
        HttpClient http,
        IMemoryCache cache,
        IOptions<RoutingOptions> options,
        ILogger<OsrmRouteGeometryProvider> logger)
    {
        _http = http;
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<Coordinate>> GetPathAsync(
        IReadOnlyList<Coordinate> waypoints,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || waypoints.Count < 2 || waypoints.Count > MaxWaypoints)
        {
            return [];
        }

        string key = CacheKey(waypoints);

        if (_cache.TryGetValue(key, out IReadOnlyList<Coordinate>? cached) && cached is not null)
        {
            return cached;
        }

        var path = await FetchAsync(waypoints, cancellationToken).ConfigureAwait(false);

        // شکست کش نمی‌شود: یک قطعی چند ثانیه‌ای نباید ساعت‌ها «خط مستقیم» بسازد.
        if (path.Count > 0)
        {
            _cache.Set(key, path, TimeSpan.FromHours(_options.CacheHours));
        }

        return path;
    }

    private async Task<IReadOnlyList<Coordinate>> FetchAsync(
        IReadOnlyList<Coordinate> waypoints,
        CancellationToken cancellationToken)
    {
        var url = new StringBuilder("route/v1/driving/");

        for (int i = 0; i < waypoints.Count; i++)
        {
            if (i > 0)
            {
                url.Append(';');
            }

            // ترتیب OSRM طول‌وعرض است، نه عرض‌وطول.
            url.Append(CultureInfo.InvariantCulture, $"{waypoints[i].Longitude:F6},{waypoints[i].Latitude:F6}");
        }

        url.Append("?overview=full&geometries=geojson&steps=false");

        try
        {
            using var response = await _http.GetAsync(new Uri(url.ToString(), UriKind.Relative), cancellationToken)
                .ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                LogBadStatus(_logger, (int)response.StatusCode);

                return [];
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken)
                .ConfigureAwait(false);
            var payload = await JsonSerializer
                .DeserializeAsync<OsrmRouteResponse>(stream, JsonOptions.Web, cancellationToken)
                .ConfigureAwait(false);

            var coordinates = payload?.Routes is { Count: > 0 } routes
                ? routes[0].Geometry?.Coordinates
                : null;

            if (coordinates is null || coordinates.Count < 2)
            {
                return [];
            }

            var path = new List<Coordinate>(coordinates.Count);

            foreach (var pair in coordinates)
            {
                if (pair.Length < 2)
                {
                    return [];
                }

                // GeoJSON هم طول‌وطول است: [longitude, latitude]
                var point = Coordinate.Create(pair[1], pair[0]);

                if (point.IsFailure)
                {
                    return [];
                }

                path.Add(point.Value);
            }

            return path;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            LogFailed(_logger, exception.GetType().Name);

            return [];
        }
    }

    private static string CacheKey(IReadOnlyList<Coordinate> waypoints)
    {
        var key = new StringBuilder("route-geometry:");

        foreach (var point in waypoints)
        {
            key.Append(CultureInfo.InvariantCulture, $"{point.Latitude:F4},{point.Longitude:F4};");
        }

        return key.ToString();
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "سرویس هندسهٔ مسیر کد {Status} داد؛ خط مستقیم نمایش داده می‌شود.")]
    private static partial void LogBadStatus(ILogger logger, int status);

    [LoggerMessage(Level = LogLevel.Warning, Message = "هندسهٔ مسیر گرفته نشد ({Reason})؛ خط مستقیم نمایش داده می‌شود.")]
    private static partial void LogFailed(ILogger logger, string reason);

    private sealed record OsrmRouteResponse([property: JsonPropertyName("routes")] IReadOnlyList<OsrmRoute>? Routes);

    private sealed record OsrmRoute([property: JsonPropertyName("geometry")] OsrmGeometry? Geometry);

    private sealed record OsrmGeometry(
        [property: JsonPropertyName("coordinates")] IReadOnlyList<double[]>? Coordinates);
}

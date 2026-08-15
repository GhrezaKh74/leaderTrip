using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.External.Discovery;

/// <summary>کشف مکان از OpenStreetMap با Overpass.</summary>
/// <remarks>
/// خروجی عمداً «دادهٔ خام» است و همان‌طور هم برچسب می‌خورد: OSM مدت بازدید،
/// سختی مسیر، بلیت و تناسب سنی ندارد — یعنی همان فیلدهایی که امتیازدهی ما به
/// آن‌ها تکیه دارد. این‌ها فقط حفرهٔ پوشش را پر می‌کنند.
/// </remarks>
internal sealed partial class OverpassPlaceDiscovery : IPlaceDiscovery
{
    private const int MaxResults = 30;

    private readonly HttpClient _http;
    private readonly DiscoveryOptions _options;
    private readonly ILogger<OverpassPlaceDiscovery> _logger;

    public OverpassPlaceDiscovery(
        HttpClient http,
        IOptions<DiscoveryOptions> options,
        ILogger<OverpassPlaceDiscovery> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<DiscoveredPlace>> SearchAsync(
        Coordinate centre,
        double radiusKm,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            return [];
        }

        int radiusMetres = (int)Math.Clamp(radiusKm * 1000, 1000, 60_000);
        string query = BuildQuery(centre, radiusMetres);

        try
        {
            using var content = new FormUrlEncodedContent([new KeyValuePair<string, string>("data", query)]);
            using var response = await _http.PostAsync(new Uri("api/interpreter", UriKind.Relative), content, cancellationToken)
                .ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                LogUnavailable(_logger, (int)response.StatusCode);

                return [];
            }

            var payload = await response.Content
                .ReadFromJsonAsync<OverpassResponse>(JsonOptions.Web, cancellationToken)
                .ConfigureAwait(false);

            return Map(payload);
        }
        catch (HttpRequestException ex)
        {
            LogFailed(_logger, ex);
            return [];
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            LogFailed(_logger, ex);
            return [];
        }
        catch (JsonException ex)
        {
            LogFailed(_logger, ex);
            return [];
        }
    }

    private static string BuildQuery(Coordinate centre, int radiusMetres)
    {
        string around = string.Create(
            CultureInfo.InvariantCulture,
            $"(around:{radiusMetres},{centre.Latitude:F5},{centre.Longitude:F5})");

        // فقط چیزهایی که ارزش بازدید دارند. بدون این فیلترها، نتیجه پر می‌شود
        // از تابلو و نیمکت و سطل زباله.
        return "[out:json][timeout:25];("
            + $"node[\"tourism\"~\"^(attraction|museum|viewpoint|artwork)$\"]{around};"
            + $"node[\"historic\"]{around};"
            + $"node[\"natural\"~\"^(waterfall|cave_entrance|peak|beach|spring)$\"]{around};"
            + $"node[\"leisure\"~\"^(park|garden)$\"]{around};"
            + $");out body {MaxResults};";
    }

    private static List<DiscoveredPlace> Map(OverpassResponse? payload)
    {
        if (payload?.Elements is not { Length: > 0 } elements)
        {
            return [];
        }

        var places = new List<DiscoveredPlace>();

        foreach (var element in elements)
        {
            // مکانِ بی‌نام برای کاربر بی‌فایده است؛ «node/123456» نامی نیست که
            // بشود در برنامهٔ سفر گذاشت.
            if (element.Tags is not { } tags
                || !tags.TryGetValue("name", out string? name)
                || string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var location = Coordinate.Create(element.Lat, element.Lon);

            if (location.IsFailure)
            {
                continue;
            }

            var (category, rawTag) = GuessCategory(tags);

            places.Add(new DiscoveredPlace(
                string.Create(CultureInfo.InvariantCulture, $"node/{element.Id}"),
                name,
                location.Value,
                category,
                rawTag));
        }

        return places;
    }

    /// <summary>حدس دستهٔ ما از تگ‌های OSM — و «حدس» بودنش در رابط کاربری هم گفته می‌شود.</summary>
    private static (PoiCategory Category, string RawTag) GuessCategory(Dictionary<string, string> tags)
    {
        if (tags.TryGetValue("historic", out string? historic))
        {
            return (PoiCategory.Historical, $"historic={historic}");
        }

        if (tags.TryGetValue("natural", out string? natural))
        {
            return (natural switch
            {
                "waterfall" => PoiCategory.Waterfall,
                "cave_entrance" => PoiCategory.Cave,
                "peak" => PoiCategory.Mountain,
                "beach" => PoiCategory.Beach,
                _ => PoiCategory.Nature,
            }, $"natural={natural}");
        }

        if (tags.TryGetValue("tourism", out string? tourism))
        {
            return (tourism switch
            {
                "museum" => PoiCategory.Museum,
                "viewpoint" => PoiCategory.Nature,
                _ => PoiCategory.Entertainment,
            }, $"tourism={tourism}");
        }

        if (tags.TryGetValue("leisure", out string? leisure))
        {
            return (PoiCategory.Garden, $"leisure={leisure}");
        }

        return (PoiCategory.Entertainment, "unknown");
    }

    [LoggerMessage(
        EventId = 40,
        Level = LogLevel.Information,
        Message = "سرویس کشف کد {Status} برگرداند؛ نتیجه‌ای برنمی‌گردد.")]
    private static partial void LogUnavailable(ILogger logger, int status);

    [LoggerMessage(
        EventId = 41,
        Level = LogLevel.Information,
        Message = "سرویس کشف در دسترس نبود؛ نتیجه‌ای برنمی‌گردد.")]
    private static partial void LogFailed(ILogger logger, Exception exception);

    private sealed record OverpassResponse(OverpassElement[]? Elements);

    private sealed record OverpassElement(long Id, double Lat, double Lon, Dictionary<string, string>? Tags);
}

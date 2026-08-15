using System.Globalization;
using System.Text;
using System.Text.Json;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.ValueObjects;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.External.Elevation;

/// <summary>ارتفاع نقاط از Open-Meteo.</summary>
/// <remarks>
/// ارتفاع یک نقطه هرگز عوض نمی‌شود، پس کش دائمی است و هر نقطه فقط یک‌بار
/// پرسیده می‌شود. کلید با سه رقم اعشار گرد می‌شود — حدود صد متر، که برای
/// تشخیص گردنه کافی است و کش را از پرشدن با نقاط تقریباً یکسان نجات می‌دهد.
/// </remarks>
internal sealed partial class OpenMeteoElevationProvider : IElevationProvider
{
    private const int MaxPointsPerRequest = 100;

    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;
    private readonly WeatherOptions _options;
    private readonly ILogger<OpenMeteoElevationProvider> _logger;

    public OpenMeteoElevationProvider(
        IHttpClientFactory httpFactory,
        IMemoryCache cache,
        IOptions<WeatherOptions> options,
        ILogger<OpenMeteoElevationProvider> logger)
    {
        _httpFactory = httpFactory;
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<double>> GetAsync(
        IReadOnlyList<Coordinate> points,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(points);

        if (!_options.Enabled || points.Count == 0)
        {
            return [];
        }

        var results = new double?[points.Count];
        var missing = new List<int>();

        for (int i = 0; i < points.Count; i++)
        {
            if (_cache.TryGetValue(Key(points[i]), out double cached))
            {
                results[i] = cached;
            }
            else
            {
                missing.Add(i);
            }
        }

        if (missing.Count > 0)
        {
            // بریدن صریح است: گزارشی که ادعا می‌کند کل مسیر بررسی شده ولی نشده،
            // بدتر از گزارشی است که می‌گوید تا کجا را دیده.
            if (missing.Count > MaxPointsPerRequest)
            {
                LogTruncated(_logger, MaxPointsPerRequest, missing.Count);
                missing = missing.Take(MaxPointsPerRequest).ToList();
            }

            var fetched = await FetchAsync([.. missing.Select(i => points[i])], cancellationToken)
                .ConfigureAwait(false);

            for (int i = 0; i < missing.Count && i < fetched.Count; i++)
            {
                results[missing[i]] = fetched[i];
                _cache.Set(Key(points[missing[i]]), fetched[i]);
            }
        }

        // اگر حتی یک نقطه هم ناشناخته ماند، فهرست ناقص برنمی‌گردد: مصرف‌کننده
        // نمی‌تواند بفهمد کدام خانه واقعی است و کدام جای خالی.
        return results.All(v => v.HasValue) ? [.. results.Select(v => v!.Value)] : [];
    }

    private static object Key(Coordinate point) =>
        (Math.Round(point.Latitude, 3), Math.Round(point.Longitude, 3), "elevation");

    private async Task<IReadOnlyList<double>> FetchAsync(
        List<Coordinate> points,
        CancellationToken cancellationToken)
    {
        var latitudes = new StringBuilder();
        var longitudes = new StringBuilder();

        for (int i = 0; i < points.Count; i++)
        {
            if (i > 0)
            {
                latitudes.Append(',');
                longitudes.Append(',');
            }

            latitudes.Append(points[i].Latitude.ToString("F4", CultureInfo.InvariantCulture));
            longitudes.Append(points[i].Longitude.ToString("F4", CultureInfo.InvariantCulture));
        }

        var client = _httpFactory.CreateClient(HttpClients.WeatherForecast);
        var uri = new Uri($"v1/elevation?latitude={latitudes}&longitude={longitudes}", UriKind.Relative);

        try
        {
            using var response = await client.GetAsync(uri, cancellationToken).ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                LogUnavailable(_logger, (int)response.StatusCode);

                return [];
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            var payload = await JsonSerializer
                .DeserializeAsync<ElevationResponse>(stream, JsonOptions.Web, cancellationToken)
                .ConfigureAwait(false);

            return payload?.Elevation ?? [];
        }
        catch (HttpRequestException)
        {
            return [];
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    [LoggerMessage(
        EventId = 30,
        Level = LogLevel.Information,
        Message = "پرسش ارتفاع به {Limit} نقطه محدود شد (درخواست: {Requested}).")]
    private static partial void LogTruncated(ILogger logger, int limit, int requested);

    [LoggerMessage(
        EventId = 31,
        Level = LogLevel.Information,
        Message = "سرویس ارتفاع کد {Status} برگرداند؛ هشدار گردنه ساخته نمی‌شود.")]
    private static partial void LogUnavailable(ILogger logger, int status);

    private sealed record ElevationResponse(double[]? Elevation);
}

using System.Globalization;
using System.Text;
using System.Text.Json;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.External.Routing;

/// <summary>مسافت واقعی جاده از سرویس OSRM.</summary>
/// <remarks>
/// <para>
/// یک درخواست <c>/table</c> برای همهٔ نقاط زده می‌شود و ماتریس نتیجه در حافظهٔ
/// همین درخواست می‌نشیند؛ بعد از آن <see cref="TryGet"/> فقط از حافظه می‌خواند.
/// جایگزینش — یک درخواست به ازای هر جفت — در حلقهٔ انتخاب مسیر هزاران فراخوانی
/// شبکه می‌شد.
/// </para>
/// <para>
/// <b>هر خطایی به تخمین برمی‌گردد.</b> نبودِ اینترنت، سهمیهٔ تمام‌شده یا پاسخ
/// خراب نباید ساخت برنامه را متوقف کند؛ فقط
/// <see cref="DistanceSource"/> از «واقعی» به «تخمینی» می‌افتد و کاربر همین را
/// روی صفحه می‌بیند. عددِ حدس‌زده‌شده هرگز خودش را اندازه‌گیری جا نمی‌زند.
/// </para>
/// </remarks>
internal sealed partial class OsrmRoadDistanceProvider : IRoadDistanceProvider, IRoadNetworkWarmup
{
    private readonly Dictionary<(long Origin, long Destination), RoadMeasurement> _matrix = [];
    private readonly HttpClient _http;
    private readonly RoutingOptions _options;
    private readonly ILogger<OsrmRoadDistanceProvider> _logger;

    public OsrmRoadDistanceProvider(
        HttpClient http,
        IOptions<RoutingOptions> options,
        ILogger<OsrmRoadDistanceProvider> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public RoadMeasurement? TryGet(Coordinate origin, Coordinate destination) =>
        _matrix.TryGetValue((Key(origin), Key(destination)), out var measurement)
            ? measurement
            : null;

    public async Task WarmAsync(IReadOnlyList<Coordinate> points, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(points);

        if (!_options.Enabled || points.Count < 2)
        {
            return;
        }

        var unique = points.Distinct().ToList();

        if (unique.Count > _options.MaxMatrixPoints)
        {
            // بریدن بی‌صدا یعنی گزارشی که ادعا می‌کند همه‌چیز اندازه‌گیری شده.
            LogMatrixTruncated(_logger, _options.MaxMatrixPoints, unique.Count);

            unique = unique.Take(_options.MaxMatrixPoints).ToList();
        }

        try
        {
            var table = await FetchTableAsync(unique, cancellationToken).ConfigureAwait(false);

            if (table is null)
            {
                return;
            }

            Fill(unique, table.Value.Distances, table.Value.Durations);
        }
        catch (HttpRequestException ex)
        {
            LogUnreachable(_logger, ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            LogTimedOut(_logger, ex);
        }
        catch (JsonException ex)
        {
            LogUnreadable(_logger, ex);
        }
    }

    /// <summary>
    /// کلید مکان با دقت حدود ۱۰ متر. مقایسهٔ دقیقِ اعشار شناور این‌جا شکننده است:
    /// همان نقطه پس از یک رفت‌وبرگشت سریال‌سازی ممکن است در رقم پانزدهم فرق کند.
    /// </summary>
    private static long Key(Coordinate point) =>
        (long)Math.Round(point.Latitude * 10_000) * 10_000_000L
        + (long)Math.Round(point.Longitude * 10_000);

    private async Task<(double?[][] Distances, double?[][] Durations)?> FetchTableAsync(
        List<Coordinate> points,
        CancellationToken cancellationToken)
    {
        var path = new StringBuilder("table/v1/driving/");

        for (int i = 0; i < points.Count; i++)
        {
            if (i > 0)
            {
                path.Append(';');
            }

            // ترتیب OSRM طول‌وعرض است، نه عرض‌وطول. جابه‌جا نوشتنش خطایی است که
            // پاسخ می‌گیرد ولی پاسخش بی‌معناست.
            path.Append(CultureInfo.InvariantCulture, $"{points[i].Longitude:F6},{points[i].Latitude:F6}");
        }

        path.Append("?annotations=distance,duration");

        using var response = await _http.GetAsync(new Uri(path.ToString(), UriKind.Relative), cancellationToken)
            .ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            LogBadStatus(_logger, (int)response.StatusCode);

            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        var payload = await JsonSerializer
            .DeserializeAsync<OsrmTableResponse>(stream, JsonOptions.Web, cancellationToken)
            .ConfigureAwait(false);

        if (payload?.Distances is not { } distances || payload.Durations is not { } durations)
        {
            return null;
        }

        return (distances, durations);
    }

    private void Fill(List<Coordinate> points, double?[][] distances, double?[][] durations)
    {
        for (int i = 0; i < points.Count && i < distances.Length; i++)
        {
            for (int j = 0; j < points.Count && j < distances[i].Length; j++)
            {
                if (i == j || distances[i][j] is not { } meters || durations[i][j] is not { } seconds)
                {
                    continue;
                }

                _matrix[(Key(points[i]), Key(points[j]))] = new RoadMeasurement(
                    Distance.FromKilometers(meters / 1000d),
                    TimeSpan.FromSeconds(seconds));
            }
        }
    }

    // پیام‌های لاگ به‌صورت مولّدشده: رشته و آرگومان‌ها فقط وقتی ساخته می‌شوند که
    // آن سطح لاگ واقعاً روشن باشد.
    [LoggerMessage(
        EventId = 1,
        Level = LogLevel.Information,
        Message = "ماتریس مسافت به {Limit} نقطه محدود شد (درخواست: {Requested}). بقیه تخمینی می‌مانند.")]
    private static partial void LogMatrixTruncated(ILogger logger, int limit, int requested);

    [LoggerMessage(
        EventId = 2,
        Level = LogLevel.Warning,
        Message = "سرویس مسیریابی در دسترس نبود؛ مسافت‌ها تخمینی می‌مانند.")]
    private static partial void LogUnreachable(ILogger logger, Exception exception);

    [LoggerMessage(
        EventId = 3,
        Level = LogLevel.Warning,
        Message = "سرویس مسیریابی به‌موقع پاسخ نداد؛ مسافت‌ها تخمینی می‌مانند.")]
    private static partial void LogTimedOut(ILogger logger, Exception exception);

    [LoggerMessage(
        EventId = 4,
        Level = LogLevel.Warning,
        Message = "پاسخ سرویس مسیریابی قابل خواندن نبود؛ مسافت‌ها تخمینی می‌مانند.")]
    private static partial void LogUnreadable(ILogger logger, Exception exception);

    [LoggerMessage(
        EventId = 5,
        Level = LogLevel.Warning,
        Message = "سرویس مسیریابی کد {Status} برگرداند؛ مسافت‌ها تخمینی می‌مانند.")]
    private static partial void LogBadStatus(ILogger logger, int status);

    /// <summary>پاسخ سرویس <c>/table</c>. خانه‌های دست‌نیافتنی <c>null</c> می‌آیند.</summary>
    private sealed record OsrmTableResponse(double?[][]? Distances, double?[][]? Durations);
}

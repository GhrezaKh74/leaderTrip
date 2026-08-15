using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Scoring;
using LeaderTrip.Domain.ValueObjects;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.External.Weather;

/// <summary>خلاصهٔ آب‌وهوای سفر از Open-Meteo.</summary>
/// <remarks>
/// <para>
/// دو منبع دارد و مرزشان روشن است: تا ۱۶ روز آینده پیش‌بینی واقعی، و دورتر از
/// آن همان بازه در سال گذشته از بایگانی. دومی پیش‌بینی نیست و ادعایش هم نمی‌شود؛
/// «انتظار فصلی» است و فقط برای همان کاری به کار می‌آید که قاعدهٔ آب‌وهوا لازم
/// دارد — اینکه بداند سفر تیرماه کویر با سفر آذر شمال یکی نیست.
/// </para>
/// <para>
/// <b>هرگز داده جعل نمی‌کند.</b> نبودِ سرویس یعنی <see langword="null"/>، و
/// <c>WeatherSuitabilityRule</c> در نبود داده ضریب خنثی می‌دهد. مقدار
/// پیش‌فرضِ ساختگی بدتر از نبودِ داده است: بی‌صدا انتخاب‌ها را جابه‌جا می‌کند.
/// </para>
/// </remarks>
internal sealed partial class OpenMeteoWeatherProvider : IWeatherProvider
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;
    private readonly WeatherOptions _options;
    private readonly TimeProvider _clock;
    private readonly ILogger<OpenMeteoWeatherProvider> _logger;

    public OpenMeteoWeatherProvider(
        IHttpClientFactory httpFactory,
        IMemoryCache cache,
        IOptions<WeatherOptions> options,
        TimeProvider clock,
        ILogger<OpenMeteoWeatherProvider> logger)
    {
        _httpFactory = httpFactory;
        _cache = cache;
        _options = options.Value;
        _clock = clock;
        _logger = logger;
    }

    public async Task<WeatherOutlook?> GetOutlookAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || days < 1)
        {
            return null;
        }

        var endDate = startDate.AddDays(days - 1);

        // گرد کردن مختصات: دو شهر همسایه نباید دو رکورد کش جدا بگیرند، و
        // آب‌وهوای ۱۰ کیلومتر آن‌طرف‌تر برای این تصمیم فرقی ندارد.
        var key = (
            Math.Round(location.Latitude, 1),
            Math.Round(location.Longitude, 1),
            startDate,
            endDate);

        if (_cache.TryGetValue(key, out WeatherOutlook? cached))
        {
            return cached;
        }

        var outlook = await FetchAsync(location, startDate, endDate, cancellationToken).ConfigureAwait(false);

        if (outlook is not null)
        {
            _cache.Set(key, outlook, TimeSpan.FromHours(_options.CacheHours));
        }

        return outlook;
    }

    /// <summary>هوای هر روز، برای نمایش کنار برنامه.</summary>
    /// <remarks>
    /// از همان پاسخی خوانده می‌شود که خلاصهٔ امتیازدهی از آن می‌آید — یک
    /// درخواست، دو مصرف‌کننده. جدا پرسیدن یعنی دو رفت‌وبرگشت شبکه برای یک داده،
    /// و بدتر: امکان اینکه نمایش و امتیازدهی از دو پاسخ متفاوت تغذیه شوند.
    /// </remarks>
    public async Task<IReadOnlyList<DailyWeather>> GetDailyAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || days < 1)
        {
            return [];
        }

        var endDate = startDate.AddDays(days - 1);
        var key = (
            Math.Round(location.Latitude, 1),
            Math.Round(location.Longitude, 1),
            startDate,
            endDate,
            "daily");

        if (_cache.TryGetValue(key, out IReadOnlyList<DailyWeather>? cached) && cached is not null)
        {
            return cached;
        }

        var (payload, withinForecast) = await FetchRawAsync(location, startDate, endDate, cancellationToken)
            .ConfigureAwait(false);

        var daily = ToDaily(payload, startDate, days, withinForecast);

        if (daily.Count > 0)
        {
            _cache.Set(key, daily, TimeSpan.FromHours(_options.CacheHours));
        }

        return daily;
    }

    private static List<DailyWeather> ToDaily(
        DailyBlock? block,
        DateOnly startDate,
        int days,
        bool withinForecast)
    {
        if (block?.Temperature2mMax is not { Length: > 0 } maxima)
        {
            return [];
        }

        var daily = new List<DailyWeather>();

        for (int i = 0; i < days && i < maxima.Length; i++)
        {
            if (maxima[i] is not { } max)
            {
                continue;
            }

            double precipitation = withinForecast && block.PrecipitationProbabilityMax is { } chances
                ? chances.ElementAtOrDefault(i) ?? 0d
                : Math.Min(100d, (block.PrecipitationSum?.ElementAtOrDefault(i) ?? 0d) * 20d);

            daily.Add(new DailyWeather(
                startDate.AddDays(i),
                max,
                block.Temperature2mMin?.ElementAtOrDefault(i) ?? max,
                precipitation,
                (block.SnowfallSum?.ElementAtOrDefault(i) ?? 0d) > 0.1,
                withinForecast));
        }

        return daily;
    }

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private async Task<WeatherOutlook?> FetchAsync(
        Coordinate location,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken)
    {
        var (payload, withinForecast) = await FetchRawAsync(location, startDate, endDate, cancellationToken)
            .ConfigureAwait(false);

        return Summarize(payload, withinForecast);
    }

    private async Task<(DailyBlock? Payload, bool WithinForecast)> FetchRawAsync(
        Coordinate location,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(_clock.GetUtcNow().UtcDateTime);
        bool withinForecast = endDate.DayNumber - today.DayNumber <= _options.ForecastHorizonDays
                              && startDate.DayNumber >= today.DayNumber - 1;

        // خارج از افق پیش‌بینی، همان بازه در سال گذشته پرسیده می‌شود.
        var (client, from, to) = withinForecast
            ? (_httpFactory.CreateClient(HttpClients.WeatherForecast), startDate, endDate)
            : (_httpFactory.CreateClient(HttpClients.WeatherArchive), startDate.AddYears(-1), endDate.AddYears(-1));

        string query =
            $"v1/{(withinForecast ? "forecast" : "archive")}" +
            $"?latitude={location.Latitude.ToString("F3", CultureInfo.InvariantCulture)}" +
            $"&longitude={location.Longitude.ToString("F3", CultureInfo.InvariantCulture)}" +
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum" +
            (withinForecast ? ",precipitation_probability_max" : string.Empty) +
            $"&timezone=Asia%2FTehran&start_date={Iso(from)}&end_date={Iso(to)}";

        try
        {
            using var response = await client.GetAsync(new Uri(query, UriKind.Relative), cancellationToken)
                .ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                LogBadStatus(_logger, (int)response.StatusCode);

                return (null, withinForecast);
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            var payload = await JsonSerializer
                .DeserializeAsync<OpenMeteoResponse>(stream, JsonOptions.Web, cancellationToken)
                .ConfigureAwait(false);

            return (payload?.Daily, withinForecast);
        }
        catch (HttpRequestException ex)
        {
            LogUnreachable(_logger, ex);
            return (null, withinForecast);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            LogTimedOut(_logger, ex);
            return (null, withinForecast);
        }
        catch (JsonException ex)
        {
            LogUnreadable(_logger, ex);
            return (null, withinForecast);
        }
    }

    private static WeatherOutlook? Summarize(DailyBlock? daily, bool withinForecast)
    {
        if (daily?.Temperature2mMax is not { Length: > 0 } maxima)
        {
            return null;
        }

        var temperatures = maxima.OfType<double>().ToList();

        if (temperatures.Count == 0)
        {
            return null;
        }

        // بایگانی احتمال بارش ندارد؛ از مقدار واقعی بارش تخمین زده می‌شود.
        // «۵ میلی‌متر یعنی تقریباً حتماً باران بوده» — نه دقیق، ولی صادقانه‌تر از صفر.
        double precipitation = withinForecast && daily.PrecipitationProbabilityMax is { Length: > 0 } chances
            ? Average(chances)
            : Math.Min(100d, Average(daily.PrecipitationSum) * 20d);

        return new WeatherOutlook
        {
            AverageMaxTemperature = temperatures.Average(),
            AveragePrecipitationProbability = precipitation,
            HasSnow = daily.SnowfallSum?.Any(s => s is > 0.1) ?? false,
        };
    }

    private static double Average(double?[]? values)
    {
        if (values is null)
        {
            return 0d;
        }

        var present = values.OfType<double>().ToList();

        return present.Count == 0 ? 0d : present.Average();
    }

    [LoggerMessage(
        EventId = 10,
        Level = LogLevel.Information,
        Message = "سرویس هواشناسی کد {Status} برگرداند؛ برنامه بدون آب‌وهوا ساخته می‌شود.")]
    private static partial void LogBadStatus(ILogger logger, int status);

    [LoggerMessage(
        EventId = 11,
        Level = LogLevel.Information,
        Message = "سرویس هواشناسی در دسترس نبود؛ برنامه بدون آب‌وهوا ساخته می‌شود.")]
    private static partial void LogUnreachable(ILogger logger, Exception exception);

    [LoggerMessage(
        EventId = 12,
        Level = LogLevel.Information,
        Message = "سرویس هواشناسی به‌موقع پاسخ نداد؛ برنامه بدون آب‌وهوا ساخته می‌شود.")]
    private static partial void LogTimedOut(ILogger logger, Exception exception);

    [LoggerMessage(
        EventId = 13,
        Level = LogLevel.Information,
        Message = "پاسخ سرویس هواشناسی قابل خواندن نبود؛ برنامه بدون آب‌وهوا ساخته می‌شود.")]
    private static partial void LogUnreadable(ILogger logger, Exception exception);

    private sealed record OpenMeteoResponse(DailyBlock? Daily);

    /// <remarks>
    /// نام ستون‌ها صریح نوشته شده‌اند، نه سپرده به قاعدهٔ خودکار نام‌گذاری:
    /// <c>temperature_2m_max</c> مرز حرف و رقم دارد و هیچ قاعدهٔ عمومی‌ای
    /// تضمین نمی‌کند همان‌طور بازتولید شود. اشتباهش هم بی‌صداست — فیلد
    /// <see langword="null"/> می‌شود و آب‌وهوا بی‌دلیل «در دسترس نیست».
    /// </remarks>
    private sealed record DailyBlock(
        [property: JsonPropertyName("temperature_2m_max")] double?[]? Temperature2mMax,
        [property: JsonPropertyName("temperature_2m_min")] double?[]? Temperature2mMin,
        [property: JsonPropertyName("precipitation_sum")] double?[]? PrecipitationSum,
        [property: JsonPropertyName("snowfall_sum")] double?[]? SnowfallSum,
        [property: JsonPropertyName("precipitation_probability_max")] double?[]? PrecipitationProbabilityMax);
}

using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.External.Geocoding;

/// <summary>جست‌وجوی نام مکان با Nominatim.</summary>
/// <remarks>
/// جست‌وجو به ایران محدود می‌شود (<c>countrycodes=ir</c>) و نام‌ها فارسی
/// خواسته می‌شوند — کاربر این محصول «میدان نقش جهان» می‌نویسد، نه
/// «Naqsh-e Jahan Square». هر خطا فهرست خالی است، نه استثنا: نبودِ نتیجه در
/// رابط کاربری راهِ دستی دارد (انتخاب مستقیم روی نقشه).
/// </remarks>
internal sealed partial class NominatimGeocoder : IGeocoder
{
    private const int MaxResults = 8;

    private readonly HttpClient _http;
    private readonly GeocodingOptions _options;
    private readonly ILogger<NominatimGeocoder> _logger;

    public NominatimGeocoder(
        HttpClient http,
        IOptions<GeocodingOptions> options,
        ILogger<NominatimGeocoder> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<GeocodedPlace>> SearchAsync(
        string text,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(text))
        {
            return [];
        }

        var url = new Uri(
            $"search?format=jsonv2&limit={MaxResults}&countrycodes=ir&accept-language=fa&q={Uri.EscapeDataString(text)}",
            UriKind.Relative);

        try
        {
            using var response = await _http.GetAsync(url, cancellationToken).ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                LogUnavailable(_logger, (int)response.StatusCode);

                return [];
            }

            var payload = await response.Content
                .ReadFromJsonAsync<NominatimResult[]>(JsonOptions.Web, cancellationToken)
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

    private static List<GeocodedPlace> Map(NominatimResult[]? payload)
    {
        var places = new List<GeocodedPlace>();

        foreach (var item in payload ?? [])
        {
            // ‏lat/lon در jsonv2 رشته‌اند، نه عدد.
            if (!double.TryParse(item.Lat, System.Globalization.CultureInfo.InvariantCulture, out double lat)
                || !double.TryParse(item.Lon, System.Globalization.CultureInfo.InvariantCulture, out double lng))
            {
                continue;
            }

            var location = Coordinate.Create(lat, lng);

            if (location.IsFailure)
            {
                continue;
            }

            string name = string.IsNullOrWhiteSpace(item.Name) ? item.DisplayName ?? string.Empty : item.Name!;

            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            places.Add(new GeocodedPlace(name, location.Value));
        }

        return places;
    }

    [LoggerMessage(
        EventId = 50,
        Level = LogLevel.Information,
        Message = "سرویس جست‌وجوی مکان کد {Status} برگرداند؛ نتیجه‌ای برنمی‌گردد.")]
    private static partial void LogUnavailable(ILogger logger, int status);

    [LoggerMessage(
        EventId = 51,
        Level = LogLevel.Information,
        Message = "سرویس جست‌وجوی مکان در دسترس نبود؛ نتیجه‌ای برنمی‌گردد.")]
    private static partial void LogFailed(ILogger logger, Exception exception);

    private sealed record NominatimResult(
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("display_name")] string? DisplayName,
        [property: JsonPropertyName("lat")] string? Lat,
        [property: JsonPropertyName("lon")] string? Lon);
}

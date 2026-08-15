using System.Text.Json;

namespace LeaderTrip.Infrastructure.External;

/// <summary>تنظیمات مشترک خواندن پاسخ سرویس‌های بیرونی.</summary>
internal static class JsonOptions
{
    /// <summary>
    /// نام‌گذاری <c>snake_case</c> است چون هر دو سرویس بیرونی (OSRM و Open-Meteo)
    /// همین قرارداد را دارند. جایگزینش نوشتن یک صفت روی تک‌تک خاصیت‌ها بود.
    /// </summary>
    public static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };
}

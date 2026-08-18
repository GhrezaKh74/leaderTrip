using System.ComponentModel.DataAnnotations;

namespace LeaderTrip.Infrastructure.External;

/// <summary>تنظیمات سرویس مسیریابی.</summary>
/// <remarks>
/// آدرس سرور پیکربندی است نه ثابت: سرور عمومی OSRM سهمیهٔ سختگیرانه دارد و در
/// تولید باید با نمونهٔ خودی عوض شود — بدون تغییر یک خط کد.
/// </remarks>
public sealed class RoutingOptions
{
    public const string SectionName = "Routing";

    /// <summary>خاموش‌کردنش یعنی برگشت به تخمین فاصلهٔ هوایی، نه خطا.</summary>
    public bool Enabled { get; set; } = true;

    [Required]
    public Uri BaseAddress { get; set; } = new("https://router.project-osrm.org/");

    /// <summary>سقف تعداد نقاط در یک درخواست ماتریس — سرور عمومی روی ۱۰۰ است.</summary>
    [Range(2, 500)]
    public int MaxMatrixPoints { get; set; } = 90;

    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 15;

    /// <summary>مدت اعتبار مسافت‌های کش‌شده. جادهٔ بین دو نقطه زود عوض نمی‌شود.</summary>
    [Range(1, 720)]
    public int CacheHours { get; set; } = 168;
}

/// <summary>تنظیمات سرویس هواشناسی.</summary>
public sealed class WeatherOptions
{
    public const string SectionName = "Weather";

    public bool Enabled { get; set; } = true;

    [Required]
    public Uri ForecastAddress { get; set; } = new("https://api.open-meteo.com/");

    [Required]
    public Uri ArchiveAddress { get; set; } = new("https://archive-api.open-meteo.com/");

    /// <summary>افق پیش‌بینی واقعی؛ دورتر از آن، «انتظار فصلی» سال گذشته.</summary>
    [Range(1, 16)]
    public int ForecastHorizonDays { get; set; } = 16;

    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 10;

    [Range(1, 168)]
    public int CacheHours { get; set; } = 6;
}

/// <summary>تنظیمات جست‌وجوی نام مکان (Nominatim).</summary>
/// <remarks>
/// برخلاف کشفِ Overpass، پیش‌فرض روشن است: هر جست‌وجو یک درخواست سبک است که
/// فقط با کلیک کاربر اتفاق می‌افتد، و بدون آن «افزودن توقف دلخواه» فقط راه
/// دستیِ روی نقشه را دارد. سیاست Nominatim شناساندن کلاینت را لازم می‌داند —
/// هدر User-Agent در ثبت HttpClient ست می‌شود.
/// </remarks>
public sealed class GeocodingOptions
{
    public const string SectionName = "Geocoding";

    public bool Enabled { get; set; } = true;

    [Required]
    public Uri BaseAddress { get; set; } = new("https://nominatim.openstreetmap.org/");

    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 10;
}

/// <summary>تنظیمات کشف مکان از OpenStreetMap.</summary>
public sealed class DiscoveryOptions
{
    public const string SectionName = "Discovery";

    /// <summary>
    /// پیش‌فرض خاموش است.
    /// </summary>
    /// <remarks>
    /// سرور عمومی Overpass سهمیهٔ سختگیرانه دارد و هر پرسش گران است. این ویژگی
    /// «پرکردن حفرهٔ پوشش» است نه بخش اصلی محصول، پس روشن‌کردنش تصمیم آگاهانهٔ
    /// کسی است که نمونه را اجرا می‌کند.
    /// </remarks>
    public bool Enabled { get; set; }

    [Required]
    public Uri BaseAddress { get; set; } = new("https://overpass-api.de/");

    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 25;
}

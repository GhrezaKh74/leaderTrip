using System.ComponentModel.DataAnnotations;

namespace LeaderTrip.Infrastructure.Photos;

/// <summary>تنظیمات ذخیرهٔ عکس چک‌این.</summary>
public sealed class PhotoOptions
{
    public const string SectionName = "Photos";

    /// <summary>
    /// پوشهٔ نگهداری عکس‌ها. نسبی باشد، از ریشهٔ اجرای برنامه حساب می‌شود؛
    /// در داکر با یک volume به بیرون از کانتینر می‌رود تا با هر استقرار نپرد.
    /// </summary>
    [Required]
    public string RootPath { get; set; } = "data/photos";

    /// <summary>
    /// سقف حجم هر عکس. کلاینت ما پیش از ارسال کوچک می‌کند و زیر یک مگابایت
    /// می‌فرستد؛ این سقف برای کلاینت‌هایی است که کلاینت ما نیستند.
    /// </summary>
    [Range(50_000, 20_000_000)]
    public long MaxBytes { get; set; } = 5_000_000;
}

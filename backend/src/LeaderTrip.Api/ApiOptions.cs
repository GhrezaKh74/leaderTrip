using System.ComponentModel.DataAnnotations;

namespace LeaderTrip.Api;

/// <summary>تنظیمات لایهٔ وب.</summary>
public sealed class ApiOptions
{
    public const string SectionName = "Api";

    /// <summary>
    /// مبدأهایی که اجازهٔ فراخوانی از مرورگر دارند.
    /// </summary>
    /// <remarks>
    /// خالی‌گذاشتنش یعنی CORS بسته است، نه باز. پیش‌فرضِ باز روی یک API عمومی،
    /// خطایی است که تا روزی که سوءاستفاده شود دیده نمی‌شود.
    /// </remarks>
    public IReadOnlyList<string> AllowedOrigins { get; set; } = [];

    /// <summary>
    /// کلید دسترسی به اندپوینت‌های مدیریتی.
    /// </summary>
    /// <remarks>
    /// <para>
    /// خالی یعنی آن اندپوینت‌ها اصلاً ثبت نمی‌شوند. «کلید پیش‌فرض» بدترین حالت
    /// ممکن است: همه می‌دانندش و همه فکر می‌کنند محافظت وجود دارد.
    /// </para>
    /// <para>
    /// این احراز هویتِ کاربر نیست و ادعایش را هم ندارد؛ یک قفل روی در پشتی است تا
    /// تغییر قیمت‌ها عمومی نباشد. حساب کاربری و نقش لیدر کار فاز دیگری است.
    /// </para>
    /// </remarks>
    public string? AdminApiKey { get; set; }

    /// <summary>سقف درخواست در دقیقه برای هر IP.</summary>
    [Range(1, 10_000)]
    public int RequestsPerMinute { get; set; } = 60;

    /// <summary>سقف جداگانه و سخت‌گیرانه‌تر برای ساخت برنامه — گران‌ترین عملیات.</summary>
    [Range(1, 1_000)]
    public int PlanRequestsPerMinute { get; set; } = 10;
}

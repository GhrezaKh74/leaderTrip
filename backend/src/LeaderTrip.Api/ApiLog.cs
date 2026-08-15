namespace LeaderTrip.Api;

/// <summary>پیام‌های لاگ لایهٔ وب، به‌صورت مولّدشده.</summary>
/// <remarks>
/// رشته و آرگومان‌ها فقط وقتی ساخته می‌شوند که آن سطح لاگ روشن باشد. روی مسیری
/// که در هر درخواست رد می‌شود، همین تفاوت کوچک انباشته می‌شود.
/// </remarks>
internal static partial class ApiLog
{
    [LoggerMessage(
        EventId = 100,
        Level = LogLevel.Error,
        Message = "خطای پیش‌بینی‌نشده در {Path}")]
    public static partial void Unexpected(ILogger logger, Exception? exception, string path);

    [LoggerMessage(
        EventId = 101,
        Level = LogLevel.Information,
        Message = "کلید مدیریتی پیکربندی نشده است؛ اندپوینت‌های مدیریتی ثبت نشدند.")]
    public static partial void AdminDisabled(ILogger logger);
}

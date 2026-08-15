namespace LeaderTrip.Domain.Common;

/// <summary>یک خطای مشخص و قابل شناسایی در دامنه.</summary>
/// <remarks>
/// خطاهای قابل انتظار (ورودی نامعتبر، قید نقض‌شده) با <see cref="Result"/> برگردانده
/// می‌شوند، نه با پرتاب استثنا. استثنا برای چیزی است که نباید اتفاق بیفتد؛
/// «بودجه کافی نیست» اتفاقی است که هر روز می‌افتد و بخشی از منطق کسب‌وکار است.
/// </remarks>
public sealed record DomainError(string Code, string Message)
{
    public static readonly DomainError None = new(string.Empty, string.Empty);

    public static DomainError Validation(string code, string message) => new(code, message);

    public static DomainError NotFound(string code, string message) => new(code, message);

    public static DomainError Conflict(string code, string message) => new(code, message);
}

namespace LeaderTrip.Domain.Common;

/// <summary>جنس خطا — تعیین می‌کند لایه‌های بیرونی چطور با آن برخورد کنند.</summary>
/// <remarks>
/// دامنه از HTTP چیزی نمی‌داند و نباید بداند. ولی تفاوت «ورودی‌ات غلط بود» با
/// «چیزی که خواستی وجود ندارد» تفاوتی در خودِ دامنه است، نه در وب. بدون این
/// تمایز، لایهٔ API مجبور می‌شد از روی متن پیام حدس بزند — و حدس‌زدن از روی متن
/// یعنی اولین ترجمهٔ فارسی به انگلیسی، همهٔ کدهای وضعیت را خراب می‌کند.
/// </remarks>
public enum ErrorKind
{
    None,

    /// <summary>ورودی نامعتبر است.</summary>
    Validation,

    /// <summary>چیزی که خواسته شده وجود ندارد.</summary>
    NotFound,

    /// <summary>وضعیت فعلی اجازهٔ این کار را نمی‌دهد.</summary>
    Conflict,

    /// <summary>اجازهٔ انجام این کار وجود ندارد.</summary>
    Forbidden,
}

/// <summary>یک خطای مشخص و قابل شناسایی در دامنه.</summary>
/// <remarks>
/// خطاهای قابل انتظار (ورودی نامعتبر، قید نقض‌شده) با <see cref="Result"/> برگردانده
/// می‌شوند، نه با پرتاب استثنا. استثنا برای چیزی است که نباید اتفاق بیفتد؛
/// «بودجه کافی نیست» اتفاقی است که هر روز می‌افتد و بخشی از منطق کسب‌وکار است.
/// </remarks>
public sealed record DomainError(string Code, string Message, ErrorKind Kind)
{
    public static readonly DomainError None = new(string.Empty, string.Empty, ErrorKind.None);

    public static DomainError Validation(string code, string message) =>
        new(code, message, ErrorKind.Validation);

    public static DomainError NotFound(string code, string message) =>
        new(code, message, ErrorKind.NotFound);

    public static DomainError Conflict(string code, string message) =>
        new(code, message, ErrorKind.Conflict);

    public static DomainError Forbidden(string code, string message) =>
        new(code, message, ErrorKind.Forbidden);
}

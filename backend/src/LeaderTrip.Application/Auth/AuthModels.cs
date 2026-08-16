using LeaderTrip.Domain.Common;

namespace LeaderTrip.Application.Auth;

/// <summary>
/// احراز هویت کاربر — همان «فاز دیگری» که در <c>ApiOptions.AdminApiKey</c>
/// وعده داده شده بود.
/// </summary>
/// <remarks>
/// <para>
/// چند تصمیم که شکل همه‌چیز را تعیین می‌کند:
/// </para>
/// <para>
/// <b>ایمیل و گذرواژه، نه پیامک:</b> کد یک‌بارمصرف پیامکی به سرویس پیامک ایرانی
/// و قرارداد و هزینه گره می‌خورد؛ ایمیل و گذرواژه خودبسنده است و همین امروز روی
/// هر استقراری کار می‌کند. پیامک می‌تواند بعداً به همین ساختار اضافه شود.
/// </para>
/// <para>
/// <b>توکن مات، نه JWT:</b> توکن رشتهٔ تصادفی بی‌معناست و اعتبارش با جست‌وجو در
/// انبار نشست سنجیده می‌شود. یعنی خروج واقعاً باطل می‌کند — چیزی که JWT بدون
/// فهرست ابطال نمی‌تواند — و هیچ کلید امضایی هم نیست که مدیریت و چرخانده شود.
/// </para>
/// <para>
/// <b>توکن هش‌شده ذخیره می‌شود:</b> در انبار فقط SHA-256 توکن می‌نشیند. نشت
/// پایگاه داده، نشست هیچ‌کس را نمی‌دزدد — همان منطقی که برای گذرواژه بدیهی است،
/// برای توکن هم صادق است.
/// </para>
/// </remarks>
public sealed record UserAccount(
    Guid Id,
    string Email,
    string DisplayName,
    string PasswordHash,
    DateTimeOffset CreatedAt);

/// <summary>نشست ورود — کلیدش هَش توکن است، نه خود توکن.</summary>
public sealed record AuthSession(string TokenHash, Guid UserId, DateTimeOffset ExpiresAt);

/// <summary>سفر ذخیره‌شده روی حساب — محتوا همان JSON ورودی سفر است.</summary>
/// <remarks>
/// ورودی ذخیره می‌شود نه خروجی: همان تصمیم اشتراک‌گذاری. برنامهٔ ساخته‌شده با
/// به‌روزشدن قیمت‌ها کهنه می‌شود؛ ورودی همیشه با قیمت روز بازساخته می‌شود.
/// </remarks>
public sealed record SavedTrip(
    Guid Id,
    Guid UserId,
    string Title,
    string Payload,
    DateTimeOffset UpdatedAt);

/// <summary>کاربر واردشده — چیزی که اندپوینت‌های محافظت‌شده می‌بینند.</summary>
public sealed record AuthenticatedUser(Guid Id, string Email, string DisplayName);

/// <summary>پاسخ ورود/ثبت‌نام: توکن خام (تنها باری که دیده می‌شود) و کاربر.</summary>
public sealed record AuthResponse(string Token, AuthenticatedUser User);

public interface IUserStore
{
    Task<UserAccount?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    Task<UserAccount?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>ایجاد کاربر؛ ایمیل تکراری خطای Conflict می‌دهد.</summary>
    Task<Result<UserAccount>> CreateAsync(UserAccount user, CancellationToken cancellationToken);
}

public interface ISessionStore
{
    Task CreateAsync(AuthSession session, CancellationToken cancellationToken);

    /// <summary>نشست معتبر (منقضی‌نشده) یا <see langword="null"/>.</summary>
    Task<AuthSession?> FindAsync(string tokenHash, CancellationToken cancellationToken);

    Task DeleteAsync(string tokenHash, CancellationToken cancellationToken);
}

public interface ISavedTripStore
{
    Task<IReadOnlyList<SavedTrip>> ListAsync(Guid userId, CancellationToken cancellationToken);

    Task<SavedTrip?> FindAsync(Guid userId, Guid id, CancellationToken cancellationToken);

    Task UpsertAsync(SavedTrip trip, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken cancellationToken);
}

/// <summary>هش‌کردن و سنجیدن گذرواژه — الگوریتم پشت این در پنهان است.</summary>
public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string hash);
}

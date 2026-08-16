using System.Security.Cryptography;
using System.Text;
using FluentValidation;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;

namespace LeaderTrip.Application.Auth;

/// <summary>ثبت‌نام — حساب تازه به‌علاوهٔ ورود در همان لحظه.</summary>
public sealed record RegisterCommand : ICommand<AuthResponse>
{
    public required string Email { get; init; }

    public required string Password { get; init; }

    public required string DisplayName { get; init; }
}

public sealed record LoginCommand : ICommand<AuthResponse>
{
    public required string Email { get; init; }

    public required string Password { get; init; }
}

internal sealed class RegisterValidator : AbstractValidator<RegisterCommand>
{
    public RegisterValidator()
    {
        RuleFor(c => c.Email)
            .NotEmpty().WithMessage("ایمیل لازم است.")
            .EmailAddress().WithMessage("ایمیل معتبر نیست.")
            .MaximumLength(254);

        // فقط طول؛ قاعده‌های «حرف بزرگ و علامت» گذرواژه‌های ضعیفِ قابل‌حدس‌تر
        // می‌سازند (P@ssw0rd!) و NIST هم دیگر توصیه‌شان نمی‌کند.
        RuleFor(c => c.Password)
            .MinimumLength(8).WithMessage("گذرواژه باید دست‌کم ۸ نویسه باشد.")
            .MaximumLength(256);

        RuleFor(c => c.DisplayName)
            .NotEmpty().WithMessage("نام نمایشی لازم است.")
            .MaximumLength(60);
    }
}

internal sealed class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(c => c.Email).NotEmpty().WithMessage("ایمیل لازم است.");
        RuleFor(c => c.Password).NotEmpty().WithMessage("گذرواژه لازم است.");
    }
}

/// <summary>ابزار مشترک توکن نشست.</summary>
public static class SessionTokens
{
    /// <summary>عمر نشست. ثابت، نه لغزان: توکنِ دزدیده هرگز جاودانه نمی‌شود.</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);

    /// <summary>توکن خام تازه — ۲۵۶ بیت تصادفی.</summary>
    public static string NewToken() => Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));

    /// <summary>هش انبار — در انبار هرگز توکن خام نمی‌نشیند.</summary>
    public static string HashOf(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    /// <summary>ایمیل هنجارشده — کلید یکتایی حساب.</summary>
    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}

internal sealed class RegisterHandler : ICommandHandler<RegisterCommand, AuthResponse>
{
    private readonly IUserStore _users;
    private readonly ISessionStore _sessions;
    private readonly IPasswordHasher _hasher;
    private readonly TimeProvider _clock;

    public RegisterHandler(IUserStore users, ISessionStore sessions, IPasswordHasher hasher, TimeProvider clock)
    {
        _users = users;
        _sessions = sessions;
        _hasher = hasher;
        _clock = clock;
    }

    public async Task<Result<AuthResponse>> HandleAsync(RegisterCommand command, CancellationToken cancellationToken)
    {
        var user = new UserAccount(
            Guid.NewGuid(),
            SessionTokens.NormalizeEmail(command.Email),
            command.DisplayName.Trim(),
            _hasher.Hash(command.Password),
            _clock.GetUtcNow());

        var created = await _users.CreateAsync(user, cancellationToken).ConfigureAwait(false);

        if (created.IsFailure)
        {
            return Result.Failure<AuthResponse>(created.Error);
        }

        return await IssueSessionAsync(_sessions, _clock, created.Value, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>صدور نشست — مشترک بین ثبت‌نام و ورود.</summary>
    internal static async Task<Result<AuthResponse>> IssueSessionAsync(
        ISessionStore sessions,
        TimeProvider clock,
        UserAccount user,
        CancellationToken cancellationToken)
    {
        string token = SessionTokens.NewToken();

        await sessions.CreateAsync(
            new AuthSession(SessionTokens.HashOf(token), user.Id, clock.GetUtcNow() + SessionTokens.Lifetime),
            cancellationToken).ConfigureAwait(false);

        return Result.Success(new AuthResponse(
            token,
            new AuthenticatedUser(user.Id, user.Email, user.DisplayName)));
    }
}

internal sealed class LoginHandler : ICommandHandler<LoginCommand, AuthResponse>
{
    private readonly IUserStore _users;
    private readonly ISessionStore _sessions;
    private readonly IPasswordHasher _hasher;
    private readonly TimeProvider _clock;

    public LoginHandler(IUserStore users, ISessionStore sessions, IPasswordHasher hasher, TimeProvider clock)
    {
        _users = users;
        _sessions = sessions;
        _hasher = hasher;
        _clock = clock;
    }

    public async Task<Result<AuthResponse>> HandleAsync(LoginCommand command, CancellationToken cancellationToken)
    {
        var user = await _users
            .FindByEmailAsync(SessionTokens.NormalizeEmail(command.Email), cancellationToken)
            .ConfigureAwait(false);

        // یک پیام برای هر دو حالتِ «ایمیل نیست» و «گذرواژه غلط است»: پیام
        // متفاوت یعنی هر کسی می‌تواند بفهمد چه ایمیل‌هایی حساب دارند.
        if (user is null || !_hasher.Verify(command.Password, user.PasswordHash))
        {
            return Result.Failure<AuthResponse>(DomainError.Forbidden(
                "auth.invalidCredentials", "ایمیل یا گذرواژه درست نیست."));
        }

        return await RegisterHandler.IssueSessionAsync(_sessions, _clock, user, cancellationToken)
            .ConfigureAwait(false);
    }
}

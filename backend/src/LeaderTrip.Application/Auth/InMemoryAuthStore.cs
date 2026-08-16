using System.Collections.Concurrent;
using LeaderTrip.Domain.Common;

namespace LeaderTrip.Application.Auth;

/// <summary>انبار حافظه‌ای حساب‌ها — برای اجرای بدون پایگاه داده.</summary>
/// <remarks>
/// همان نقشی که مخزن‌های seed برای دادهٔ مرجع دارند: دمو و تستِ بدون Postgres.
/// حساب‌ها با راه‌اندازی دوباره می‌پرند — و این پنهان نیست؛ در سند معماری آمده
/// که استقرار واقعیِ احراز هویت، پایگاه داده می‌خواهد.
/// </remarks>
public sealed class InMemoryAuthStore : IUserStore, ISessionStore, ISavedTripStore
{
    private readonly ConcurrentDictionary<Guid, UserAccount> _users = new();
    private readonly ConcurrentDictionary<string, Guid> _byEmail = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, AuthSession> _sessions = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, SavedTrip>> _trips = new();
    private readonly TimeProvider _clock;

    public InMemoryAuthStore(TimeProvider clock) => _clock = clock;

    public Task<UserAccount?> FindByEmailAsync(string email, CancellationToken cancellationToken) =>
        Task.FromResult(_byEmail.TryGetValue(email, out var id) && _users.TryGetValue(id, out var user)
            ? user
            : null);

    public Task<UserAccount?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        Task.FromResult(_users.TryGetValue(id, out var user) ? user : null);

    public Task<Result<UserAccount>> CreateAsync(UserAccount user, CancellationToken cancellationToken)
    {
        // ثبت ایمیل اول می‌آید تا یکتایی اتمی باشد؛ دو ثبت‌نام هم‌زمان با یک
        // ایمیل، فقط یکی برنده می‌شود.
        if (!_byEmail.TryAdd(user.Email, user.Id))
        {
            return Task.FromResult(Result.Failure<UserAccount>(DomainError.Conflict(
                "auth.emailTaken", "با این ایمیل قبلاً حسابی ساخته شده است.")));
        }

        _users[user.Id] = user;

        return Task.FromResult(Result.Success(user));
    }

    public Task CreateAsync(AuthSession session, CancellationToken cancellationToken)
    {
        _sessions[session.TokenHash] = session;

        return Task.CompletedTask;
    }

    public Task<AuthSession?> FindAsync(string tokenHash, CancellationToken cancellationToken)
    {
        if (!_sessions.TryGetValue(tokenHash, out var session))
        {
            return Task.FromResult<AuthSession?>(null);
        }

        if (session.ExpiresAt <= _clock.GetUtcNow())
        {
            _sessions.TryRemove(tokenHash, out _);

            return Task.FromResult<AuthSession?>(null);
        }

        return Task.FromResult<AuthSession?>(session);
    }

    public Task DeleteAsync(string tokenHash, CancellationToken cancellationToken)
    {
        _sessions.TryRemove(tokenHash, out _);

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<SavedTrip>> ListAsync(Guid userId, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<SavedTrip>>(
            TripsOf(userId).Values.OrderByDescending(trip => trip.UpdatedAt).ToList());

    public Task<SavedTrip?> FindAsync(Guid userId, Guid id, CancellationToken cancellationToken) =>
        Task.FromResult(TripsOf(userId).TryGetValue(id, out var trip) ? trip : null);

    public Task UpsertAsync(SavedTrip trip, CancellationToken cancellationToken)
    {
        TripsOf(trip.UserId)[trip.Id] = trip;

        return Task.CompletedTask;
    }

    public Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken cancellationToken) =>
        Task.FromResult(TripsOf(userId).TryRemove(id, out _));

    private ConcurrentDictionary<Guid, SavedTrip> TripsOf(Guid userId) =>
        _trips.GetOrAdd(userId, _ => new ConcurrentDictionary<Guid, SavedTrip>());
}

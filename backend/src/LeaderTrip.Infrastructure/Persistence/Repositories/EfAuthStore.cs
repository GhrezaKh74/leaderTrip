using LeaderTrip.Application.Auth;
using LeaderTrip.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace LeaderTrip.Infrastructure.Persistence.Repositories;

/// <summary>انبار حساب‌ها، نشست‌ها و سفرهای ذخیره‌شده روی Postgres.</summary>
internal sealed class EfAuthStore : IUserStore, ISessionStore, ISavedTripStore
{
    private readonly LeaderTripDbContext _db;
    private readonly TimeProvider _clock;

    public EfAuthStore(LeaderTripDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<UserAccount?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var row = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken)
            .ConfigureAwait(false);

        return row is null ? null : ToUser(row);
    }

    public async Task<UserAccount?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken)
            .ConfigureAwait(false);

        return row is null ? null : ToUser(row);
    }

    public async Task<Result<UserAccount>> CreateAsync(UserAccount user, CancellationToken cancellationToken)
    {
        _db.Users.Add(new UserRow(user.Id, user.Email, user.DisplayName, user.PasswordHash, user.CreatedAt));

        try
        {
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException)
        {
            // ایندکس یکتای ایمیل — دو ثبت‌نام هم‌زمان، یکی به این‌جا می‌رسد.
            return Result.Failure<UserAccount>(DomainError.Conflict(
                "auth.emailTaken", "با این ایمیل قبلاً حسابی ساخته شده است."));
        }

        return Result.Success(user);
    }

    public async Task CreateAsync(AuthSession session, CancellationToken cancellationToken)
    {
        _db.Sessions.Add(new SessionRow(session.TokenHash, session.UserId, session.ExpiresAt));

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<AuthSession?> FindAsync(string tokenHash, CancellationToken cancellationToken)
    {
        var now = _clock.GetUtcNow();

        var row = await _db.Sessions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.ExpiresAt > now, cancellationToken)
            .ConfigureAwait(false);

        return row is null ? null : new AuthSession(row.TokenHash, row.UserId, row.ExpiresAt);
    }

    public async Task DeleteAsync(string tokenHash, CancellationToken cancellationToken) =>
        await _db.Sessions.Where(s => s.TokenHash == tokenHash)
            .ExecuteDeleteAsync(cancellationToken)
            .ConfigureAwait(false);

    public async Task<IReadOnlyList<SavedTrip>> ListAsync(Guid userId, CancellationToken cancellationToken) =>
        await _db.SavedTrips.AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.UpdatedAt)
            .Select(t => new SavedTrip(t.Id, t.UserId, t.Title, t.Payload, t.UpdatedAt))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    public async Task<SavedTrip?> FindAsync(Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var row = await _db.SavedTrips.AsNoTracking()
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Id == id, cancellationToken)
            .ConfigureAwait(false);

        return row is null ? null : new SavedTrip(row.Id, row.UserId, row.Title, row.Payload, row.UpdatedAt);
    }

    public async Task UpsertAsync(SavedTrip trip, CancellationToken cancellationToken)
    {
        var existing = await _db.SavedTrips
            .FirstOrDefaultAsync(t => t.UserId == trip.UserId && t.Id == trip.Id, cancellationToken)
            .ConfigureAwait(false);

        if (existing is null)
        {
            _db.SavedTrips.Add(new SavedTripRow(trip.Id, trip.UserId, trip.Title, trip.Payload, trip.UpdatedAt));
        }
        else
        {
            existing.Title = trip.Title;
            existing.Payload = trip.Payload;
            existing.UpdatedAt = trip.UpdatedAt;
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken cancellationToken) =>
        await _db.SavedTrips.Where(t => t.UserId == userId && t.Id == id)
            .ExecuteDeleteAsync(cancellationToken)
            .ConfigureAwait(false) > 0;

    private static UserAccount ToUser(UserRow row) =>
        new(row.Id, row.Email, row.DisplayName, row.PasswordHash, row.CreatedAt);
}

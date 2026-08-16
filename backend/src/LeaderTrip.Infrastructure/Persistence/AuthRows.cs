namespace LeaderTrip.Infrastructure.Persistence;

/// <summary>ردیف حساب کاربری.</summary>
/// <remarks>
/// مثل بقیهٔ ردیف‌ها از مدل Application جداست؛ نگاشت در
/// <see cref="Repositories.EfAuthStore"/> است و رکورد Application هیچ امتیازی
/// به EF نمی‌دهد.
/// </remarks>
public sealed class UserRow
{
    public UserRow(Guid id, string email, string displayName, string passwordHash, DateTimeOffset createdAt)
    {
        Id = id;
        Email = email;
        DisplayName = displayName;
        PasswordHash = passwordHash;
        CreatedAt = createdAt;
    }

    public Guid Id { get; init; }

    public string Email { get; init; }

    public string DisplayName { get; init; }

    public string PasswordHash { get; init; }

    public DateTimeOffset CreatedAt { get; init; }
}

/// <summary>ردیف نشست ورود — کلید اصلی، هَش توکن است.</summary>
public sealed class SessionRow
{
    public SessionRow(string tokenHash, Guid userId, DateTimeOffset expiresAt)
    {
        TokenHash = tokenHash;
        UserId = userId;
        ExpiresAt = expiresAt;
    }

    public string TokenHash { get; init; }

    public Guid UserId { get; init; }

    public DateTimeOffset ExpiresAt { get; init; }
}

/// <summary>ردیف سفر ذخیره‌شده — محتوا JSON ورودی سفر است، همان تصمیم دفترچهٔ قیمت.</summary>
public sealed class SavedTripRow
{
    public SavedTripRow(Guid id, Guid userId, string title, string payload, DateTimeOffset updatedAt)
    {
        Id = id;
        UserId = userId;
        Title = title;
        Payload = payload;
        UpdatedAt = updatedAt;
    }

    public Guid Id { get; init; }

    public Guid UserId { get; init; }

    public string Title { get; set; }

    public string Payload { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}

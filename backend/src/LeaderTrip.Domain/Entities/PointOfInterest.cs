using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Entities;

/// <summary>یک جاذبهٔ گردشگری با همهٔ چیزهایی که برنامه‌ریزی به آن نیاز دارد.</summary>
/// <remarks>
/// فیلدهایی مثل <see cref="Difficulty"/>، <see cref="MinimumAge"/> و
/// <see cref="RequiredVehicle"/> همان‌هایی هستند که دادهٔ خام OpenStreetMap ندارد —
/// و دقیقاً همان‌ها هستند که برنامه‌ریزی را از «فهرست جاهای قشنگ» جدا می‌کنند.
/// </remarks>
public sealed class PointOfInterest
{
    public PointOfInterest(
        string id,
        string name,
        string cityId,
        Coordinate location,
        PoiCategory category,
        double rating,
        TimeSpan visitDuration,
        Money ticket,
        IReadOnlySet<int> bestMonths,
        bool isIndoor,
        Difficulty difficulty,
        int minimumAge,
        bool isKidFriendly,
        bool isSeniorFriendly,
        OffroadCapability requiredVehicle,
        string description,
        bool isNightSuitable = false,
        IReadOnlyList<string>? tags = null,
        TimeSpan? opensAt = null,
        TimeSpan? closesAt = null)
    {
        Id = id;
        Name = name;
        CityId = cityId;
        Location = location;
        Category = category;
        Rating = rating;
        VisitDuration = visitDuration;
        Ticket = ticket;
        BestMonths = bestMonths;
        IsIndoor = isIndoor;
        Difficulty = difficulty;
        MinimumAge = minimumAge;
        IsKidFriendly = isKidFriendly;
        IsSeniorFriendly = isSeniorFriendly;
        RequiredVehicle = requiredVehicle;
        Description = description;
        IsNightSuitable = isNightSuitable;
        Tags = tags ?? [];
        OpensAt = opensAt;
        ClosesAt = closesAt;
    }

    public string Id { get; }

    public string Name { get; }

    public string CityId { get; }

    public Coordinate Location { get; }

    public PoiCategory Category { get; }

    /// <summary>کیفیت عمومی، ۱ تا ۵ — نه امتیاز این گروه خاص.</summary>
    public double Rating { get; }

    public TimeSpan VisitDuration { get; }

    public Money Ticket { get; }

    /// <summary>ماه‌های میلادی مناسب بازدید (۱ تا ۱۲).</summary>
    public IReadOnlySet<int> BestMonths { get; }

    public bool IsIndoor { get; }

    public Difficulty Difficulty { get; }

    public int MinimumAge { get; }

    public bool IsKidFriendly { get; }

    public bool IsSeniorFriendly { get; }

    public OffroadCapability RequiredVehicle { get; }

    public string Description { get; }

    /// <summary>آیا بازدید شبانه معنا دارد؟ — برای برنامهٔ شب‌های سفر.</summary>
    public bool IsNightSuitable { get; }

    /// <summary>برچسب‌های آزاد («یونسکو»، «رایگان»، …) — برای نمایش و جست‌وجو.</summary>
    public IReadOnlyList<string> Tags { get; }

    /// <summary>ساعت بازشدن (از نیمه‌شب)؛ <see langword="null"/> یعنی بی‌محدودیت.</summary>
    public TimeSpan? OpensAt { get; }

    /// <summary>ساعت بسته‌شدن (از نیمه‌شب)؛ <see langword="null"/> یعنی بی‌محدودیت.</summary>
    public TimeSpan? ClosesAt { get; }

    public bool IsFree => Ticket == Money.Zero;

    public bool IsInSeason(int month) => BestMonths.Contains(month);

    /// <summary>
    /// زودترین شروع ممکن بازدید اگر ساعت <paramref name="arrival"/> برسیم؛
    /// <see langword="null"/> اگر بازدید با این مدت، پیش از بسته‌شدن تمام نمی‌شود.
    /// </summary>
    /// <remarks>
    /// بدون این قید، برنامه باغ و موزه را ساعت هفت شب می‌گذاشت — روی کاغذ
    /// بی‌نقص و جلوی درِ بسته بی‌معنا.
    /// </remarks>
    public TimeSpan? EarliestVisitStart(TimeSpan arrival, TimeSpan visitDuration)
    {
        var start = OpensAt is { } opens && arrival < opens ? opens : arrival;

        return ClosesAt is { } closes && start + visitDuration > closes ? null : start;
    }
}

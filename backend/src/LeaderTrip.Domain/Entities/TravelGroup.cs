using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Domain.Entities;

/// <summary>گروه همسفران و خصوصیاتی که از ترکیبشان درمی‌آید.</summary>
/// <remarks>
/// قاعدهٔ حاکم بر کل این کلاس: <b>ضعیف‌ترین عضو، سقف را تعیین می‌کند.</b>
/// برنامه‌ای که برای میانگین گروه چیده شود، برای کسی که از همه ناتوان‌تر است
/// نشدنی می‌شود — و او همان کسی است که سفر برایش خراب خواهد شد.
/// </remarks>
public sealed class TravelGroup
{
    private readonly IReadOnlyList<Traveler> _travelers;

    private TravelGroup(IReadOnlyList<Traveler> travelers) => _travelers = travelers;

    public IReadOnlyList<Traveler> Travelers => _travelers;

    public int Count => _travelers.Count;

    public int YoungestAge => _travelers.Min(t => t.Age);

    public int OldestAge => _travelers.Max(t => t.Age);

    public int DriverCount => _travelers.Count(t => t.IsDriver);

    public bool HasToddler => _travelers.Any(t => t.Age < 4);

    public bool HasChild => _travelers.Any(t => t.Age is >= 4 and <= 12);

    public bool HasSenior => _travelers.Any(t => t.Age >= 65);

    public bool HasWheelchairUser => _travelers.Any(t => t.Mobility == MobilityLevel.Wheelchair);

    /// <summary>توان جسمی گروه — برابر توان ضعیف‌ترین عضو.</summary>
    public double Stamina => _travelers.Min(t => t.Stamina);

    /// <summary>بیشترین سختی مسیری که این گروه واقعاً از پس آن برمی‌آید.</summary>
    public Difficulty MaximumDifficulty => Stamina switch
    {
        < 0.20 => Difficulty.None,
        < 0.50 => Difficulty.Light,
        < 0.85 => Difficulty.Heavy,
        _ => Difficulty.Climbing,
    };

    /// <summary>ضریب کندشدن حرکت گروه — توقف‌های بیشتر، سوارشدن و پیاده‌شدن کندتر.</summary>
    public double PaceFactor => (HasToddler || OldestAge >= 70) ? 0.90
        : (HasChild || HasSenior) ? 0.95
        : 1.00;

    /// <summary>ضریب کش‌آمدن مدت بازدید — با کودک و سالمند همه‌چیز طول می‌کشد.</summary>
    public double VisitDurationFactor => (HasToddler || HasChild) && HasSenior ? 1.30
        : (HasToddler || HasChild) || HasSenior ? 1.20
        : 1.00;

    public static Result<TravelGroup> Create(IEnumerable<Traveler> travelers)
    {
        var list = travelers.ToList();

        if (list.Count == 0)
        {
            return Result.Failure<TravelGroup>(
                DomainError.Validation("group.empty", "حداقل یک همسفر لازم است."));
        }

        if (list.DistinctBy(t => t.Id).Count() != list.Count)
        {
            return Result.Failure<TravelGroup>(
                DomainError.Validation("group.duplicate", "شناسهٔ همسفران نباید تکراری باشد."));
        }

        return new TravelGroup(list);
    }
}

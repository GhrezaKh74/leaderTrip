using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Specifications.Poi;

/// <summary>خودرو باید بتواند به جاذبه برسد.</summary>
public sealed class VehicleCanReachSpecification : Specification<PointOfInterest>
{
    private readonly Vehicle _vehicle;

    public VehicleCanReachSpecification(Vehicle vehicle) => _vehicle = vehicle;

    public override SpecificationResult Evaluate(PointOfInterest candidate) =>
        _vehicle.CanReach(candidate.RequiredVehicle)
            ? SpecificationResult.Satisfied
            : SpecificationResult.NotSatisfied(
                candidate.RequiredVehicle == OffroadCapability.FullOffroad
                    ? "نیاز به خودروی آفرود دارد"
                    : "نیاز به خودروی شاسی‌بلند دارد");
}

/// <summary>سختی مسیر نباید از توان گروه بیشتر باشد.</summary>
public sealed class GroupCanHandleDifficultySpecification : Specification<PointOfInterest>
{
    private readonly TravelGroup _group;

    public GroupCanHandleDifficultySpecification(TravelGroup group) => _group = group;

    public override SpecificationResult Evaluate(PointOfInterest candidate)
    {
        if (_group.HasWheelchairUser && candidate.Difficulty >= Difficulty.Heavy)
        {
            return SpecificationResult.NotSatisfied("دسترسی با ویلچر ممکن نیست");
        }

        return candidate.Difficulty <= _group.MaximumDifficulty
            ? SpecificationResult.Satisfied
            : SpecificationResult.NotSatisfied("سختی مسیر بیش از توان گروه است");
    }
}

/// <summary>کم‌سن‌ترین عضو گروه باید مجاز به بازدید باشد.</summary>
public sealed class MinimumAgeSpecification : Specification<PointOfInterest>
{
    private readonly TravelGroup _group;

    public MinimumAgeSpecification(TravelGroup group) => _group = group;

    public override SpecificationResult Evaluate(PointOfInterest candidate) =>
        candidate.MinimumAge <= _group.YoungestAge
            ? SpecificationResult.Satisfied
            : SpecificationResult.NotSatisfied($"حداقل سن {candidate.MinimumAge} سال");
}

/// <summary>ماه سفر باید در بازهٔ مناسب بازدید باشد.</summary>
public sealed class InSeasonSpecification : Specification<PointOfInterest>
{
    private readonly int _month;

    public InSeasonSpecification(int month) => _month = month;

    public override SpecificationResult Evaluate(PointOfInterest candidate) =>
        candidate.IsInSeason(_month)
            ? SpecificationResult.Satisfied
            : SpecificationResult.NotSatisfied("خارج از فصل مناسب بازدید");
}

/// <summary>جاذبه باید در شعاع جست‌وجو باشد.</summary>
public sealed class WithinRadiusSpecification : Specification<PointOfInterest>
{
    private readonly Coordinate _origin;
    private readonly Distance _radius;

    public WithinRadiusSpecification(Coordinate origin, Distance radius)
    {
        _origin = origin;
        _radius = radius;
    }

    public override SpecificationResult Evaluate(PointOfInterest candidate) =>
        _origin.StraightLineTo(candidate.Location) <= _radius
            ? SpecificationResult.Satisfied
            : SpecificationResult.NotSatisfied("خارج از شعاع جست‌وجو");
}

/// <summary>جاذبه‌های شهر خودِ مسافر در سفر چندروزه کنار گذاشته می‌شوند.</summary>
/// <remarks>
/// این قاعده در نسخهٔ قبلی با آزمون‌وخطا کشف شد و هزینهٔ ندانستنش زیاد بود:
/// رسیدن به جاذبه‌های شهر خودِ مسافر زمان اضافه‌ای نمی‌برد، پس هر معیارِ
/// «ارزش به ازای زمان» آن‌ها را برنده می‌کند و کل برنامه را می‌بلعند.
/// در سفر یک‌روزه اما گشت شهری کاملاً معنا دارد.
/// </remarks>
public sealed class NotInHomeCitySpecification : Specification<PointOfInterest>
{
    private readonly string _originCityId;
    private readonly int _tripDays;

    public NotInHomeCitySpecification(string originCityId, int tripDays)
    {
        _originCityId = originCityId;
        _tripDays = tripDays;
    }

    public override SpecificationResult Evaluate(PointOfInterest candidate) =>
        _tripDays < 2 || !string.Equals(candidate.CityId, _originCityId, StringComparison.Ordinal)
            ? SpecificationResult.Satisfied
            : SpecificationResult.NotSatisfied("در شهر خودتان است");
}

/// <summary>جاذبه‌هایی که کاربر صریحاً کنار گذاشته.</summary>
public sealed class NotExcludedSpecification : Specification<PointOfInterest>
{
    private readonly IReadOnlySet<string> _excludedIds;

    public NotExcludedSpecification(IReadOnlySet<string> excludedIds) => _excludedIds = excludedIds;

    public override SpecificationResult Evaluate(PointOfInterest candidate) =>
        _excludedIds.Contains(candidate.Id)
            ? SpecificationResult.NotSatisfied("کاربر حذف کرده")
            : SpecificationResult.Satisfied;
}

using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Planning;

/// <summary>ترتیب بازدیدها را به برنامهٔ ساعت‌به‌ساعت روزها تبدیل می‌کند.</summary>
/// <remarks>
/// قید سخت: مجموع رانندگی هر روز از سقف تعیین‌شده بیشتر نمی‌شود. جاذبه‌ای که
/// جا نشود به روز بعد می‌رود؛ اگر تا آخر جا نشد، صریحاً گزارش می‌شود — نه اینکه
/// بی‌صدا حذف شود.
/// </remarks>
public sealed class DayScheduler
{
    private static readonly TimeSpan Breakfast = TimeSpan.FromMinutes(45);
    private static readonly TimeSpan Dinner = TimeSpan.FromMinutes(75);
    private static readonly TimeSpan RestStop = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan ContinuousDriveLimit = TimeSpan.FromMinutes(120);
    private static readonly TimeSpan LunchWindowStart = TimeSpan.FromHours(12);
    private static readonly TimeSpan LunchWindowEnd = TimeSpan.FromHours(14.5);

    private readonly TravelPlanner _travelPlanner;

    public DayScheduler(TravelPlanner travelPlanner) => _travelPlanner = travelPlanner;

    /// <summary>ساخت برنامهٔ روزها.</summary>
    /// <param name="route">ترتیب بازدیدها.</param>
    /// <param name="request">پارامترهای زمان‌بندی.</param>
    /// <returns>روزها و جاذبه‌هایی که جا نشدند.</returns>
    public ScheduleResult Schedule(IReadOnlyList<PointOfInterest> route, ScheduleRequest request)
    {
        var pending = new LinkedList<PointOfInterest>(route);
        var days = new List<DayPlan>(request.Days);
        var current = request.Origin;
        var currentCity = request.OriginCity;
        bool anyRouted = false;
        bool anyEstimated = false;

        for (int dayIndex = 0; dayIndex < request.Days; dayIndex++)
        {
            bool isLastDay = dayIndex == request.Days - 1;
            var blocks = new List<PlanBlock>();
            var clock = request.DayStart;
            var driving = TimeSpan.Zero;
            var continuous = TimeSpan.Zero;
            var dayDistance = Distance.Zero;
            bool lunchDone = false;
            var visited = new List<PointOfInterest>();

            if (dayIndex > 0)
            {
                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Meal,
                    StartsAt = clock,
                    Duration = Breakfast,
                    Title = "صبحانه",
                    Cost = Money.Zero,
                    Note = currentCity.Name,
                });
                clock += Breakfast;
            }

            while (pending.Count > 0)
            {
                // جابه‌جایی دستی به‌صورت قید ورودی اعمال می‌شود، نه دستکاری خروجی:
                // اگر کاربر گفته این جاذبه روز سوم باشد، در روزهای دیگر رد می‌شود
                // و برنامه از نو و سازگار ساخته می‌شود. دستکاری مستقیم خروجی یعنی
                // مسافت و ساعت و هزینه با آنچه نمایش داده می‌شود نخواند.
                var node = FirstAllowed(pending, request, dayIndex + 1);

                if (node is null)
                {
                    break;
                }

                var next = node.Value;
                var terrain = TravelPlanner.InferTerrain(
                    currentCity.Climate, request.ClimateOf(next), current.StraightLineTo(next.Location));

                var leg = _travelPlanner.Plan(current, next.Location, terrain, request.Vehicle, request.Pace);
                var visit = TimeSpan.FromMinutes(next.VisitDuration.TotalMinutes * request.VisitStretch);

                var endCity = isLastDay && request.ReturnsToOrigin
                    ? request.OriginCity
                    : request.NearestStayCity(next.Location);

                var back = _travelPlanner.Plan(
                    next.Location,
                    endCity.Location,
                    TravelPlanner.InferTerrain(
                        request.ClimateOf(next), endCity.Climate, next.Location.StraightLineTo(endCity.Location)),
                    request.Vehicle,
                    request.Pace);

                bool needsRest = continuous + leg.Duration > ContinuousDriveLimit;
                var restTime = needsRest ? RestStop : TimeSpan.Zero;

                if (driving + leg.Duration + back.Duration > request.DailyDrivingCap
                    || clock + leg.Duration + restTime + visit + back.Duration > request.DayEnd)
                {
                    break;
                }

                pending.Remove(node);

                if (needsRest)
                {
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Rest,
                        StartsAt = clock,
                        Duration = RestStop,
                        Title = "توقف استراحت",
                        Cost = Money.Zero,
                        Note = "دو ساعت رانندگی پیوسته",
                    });
                    clock += RestStop;
                    continuous = TimeSpan.Zero;
                }

                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Drive,
                    StartsAt = clock,
                    Duration = leg.Duration,
                    Title = $"حرکت به {next.Name}",
                    Cost = Money.Zero,
                    DistanceCovered = leg.Road,
                    Note = leg.Terrain == Terrain.Mountain ? "مسیر کوهستانی" : null,
                });

                clock += leg.Duration;
                driving += leg.Duration;
                continuous += leg.Duration;
                dayDistance += leg.Road;
                TrackSource(leg, ref anyRouted, ref anyEstimated);

                if (!lunchDone && clock >= LunchWindowStart && clock <= LunchWindowEnd)
                {
                    var lunch = TimeSpan.FromMinutes(request.Style == TravelStyle.Budget ? 60 : 75);
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Meal,
                        StartsAt = clock,
                        Duration = lunch,
                        Title = "ناهار",
                        Cost = Money.Zero,
                    });
                    clock += lunch;
                    lunchDone = true;
                }

                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Visit,
                    StartsAt = clock,
                    Duration = visit,
                    Title = next.Name,
                    Cost = Money.Zero,
                    PoiId = next.Id,
                });

                clock += visit;
                continuous = TimeSpan.Zero;
                visited.Add(next);
                current = next.Location;
                currentCity = request.CityOf(next);
            }

            var stayCity = isLastDay && request.ReturnsToOrigin
                ? request.OriginCity
                : visited.Count > 0
                    ? request.NearestStayCity(visited[^1].Location)
                    : currentCity;

            if (!string.Equals(stayCity.Id, currentCity.Id, StringComparison.Ordinal))
            {
                var terrain = TravelPlanner.InferTerrain(
                    currentCity.Climate, stayCity.Climate, current.StraightLineTo(stayCity.Location));
                var leg = _travelPlanner.Plan(current, stayCity.Location, terrain, request.Vehicle, request.Pace);

                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Drive,
                    StartsAt = clock,
                    Duration = leg.Duration,
                    Title = isLastDay && request.ReturnsToOrigin
                        ? $"بازگشت به {stayCity.Name}"
                        : $"حرکت به {stayCity.Name}",
                    Cost = Money.Zero,
                    DistanceCovered = leg.Road,
                });

                clock += leg.Duration;
                driving += leg.Duration;
                dayDistance += leg.Road;
                TrackSource(leg, ref anyRouted, ref anyEstimated);
                current = stayCity.Location;
                currentCity = stayCity;
            }

            bool staysOvernight = dayIndex < request.Days - 1
                && !string.Equals(stayCity.Id, request.OriginCity.Id, StringComparison.Ordinal);

            if (staysOvernight)
            {
                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Meal,
                    StartsAt = Max(clock, TimeSpan.FromHours(19)),
                    Duration = Dinner,
                    Title = "شام",
                    Cost = Money.Zero,
                    Note = stayCity.Name,
                });

                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Lodging,
                    StartsAt = Max(clock + Dinner, TimeSpan.FromHours(21)),
                    Duration = TimeSpan.Zero,
                    Title = $"اقامت شب در {stayCity.Name}",
                    Cost = Money.Zero,
                });
            }

            days.Add(new DayPlan
            {
                Index = dayIndex + 1,
                Date = request.StartDate.AddDays(dayIndex),
                BaseCityId = stayCity.Id,
                Blocks = blocks.OrderBy(b => b.StartsAt).ToList(),
                Distance = dayDistance,
                DrivingTime = driving,
                Cost = Money.Zero,
            });
        }

        var source = anyRouted && !anyEstimated ? DistanceSource.Routed : DistanceSource.Estimated;
        return new ScheduleResult(days, pending.Select(p => p.Id).ToList(), source);
    }

    private static void TrackSource(TravelLeg leg, ref bool anyRouted, ref bool anyEstimated)
    {
        if (leg.Source == DistanceSource.Routed)
        {
            anyRouted = true;
        }
        else
        {
            anyEstimated = true;
        }
    }

    private static TimeSpan Max(TimeSpan left, TimeSpan right) => left > right ? left : right;

    /// <summary>
    /// نخستین جاذبه‌ای که اجازهٔ نشستن در این روز را دارد.
    /// </summary>
    /// <remarks>
    /// ترتیب کلی مسیر حفظ می‌شود؛ فقط جاذبه‌هایی که کاربر به روز دیگری سنجاق
    /// کرده رد می‌شوند. یعنی جابه‌جایی دستی یک قید است، نه بازچینش خروجی — و
    /// همهٔ عددها (مسافت، ساعت، هزینه) با همان چیزی می‌خوانند که دیده می‌شود.
    /// </remarks>
    private static LinkedListNode<PointOfInterest>? FirstAllowed(
        LinkedList<PointOfInterest> pending,
        ScheduleRequest request,
        int dayNumber)
    {
        for (var node = pending.First; node is not null; node = node.Next)
        {
            if (request.DayAssignments.TryGetValue(node.Value.Id, out int assigned) && assigned != dayNumber)
            {
                continue;
            }

            return node;
        }

        return null;
    }
}

/// <summary>خروجی زمان‌بندی.</summary>
public sealed record ScheduleResult(
    IReadOnlyList<DayPlan> Days,
    IReadOnlyList<string> UnscheduledPoiIds,
    DistanceSource DistanceSource);

/// <summary>پارامترهای زمان‌بندی روزها.</summary>
public sealed record ScheduleRequest
{
    public required DateOnly StartDate { get; init; }

    public required int Days { get; init; }

    public required City OriginCity { get; init; }

    public required Vehicle Vehicle { get; init; }

    public required TravelStyle Style { get; init; }

    public required TimeSpan DayStart { get; init; }

    public required TimeSpan DayEnd { get; init; }

    public required TimeSpan DailyDrivingCap { get; init; }

    public required bool ReturnsToOrigin { get; init; }

    public required double Pace { get; init; }

    public required double VisitStretch { get; init; }

    public required IReadOnlyDictionary<string, City> Cities { get; init; }

    public required IReadOnlyList<City> StayCities { get; init; }

    /// <summary>جاذبه‌هایی که کاربر دستی به روز مشخصی سنجاق کرده (شمارهٔ روز از ۱).</summary>
    public IReadOnlyDictionary<string, int> DayAssignments { get; init; } =
        new Dictionary<string, int>(StringComparer.Ordinal);

    public Coordinate Origin => OriginCity.Location;

    internal City CityOf(PointOfInterest poi) =>
        Cities.TryGetValue(poi.CityId, out var city) ? city : OriginCity;

    internal Climate ClimateOf(PointOfInterest poi) => CityOf(poi).Climate;

    /// <summary>نزدیک‌ترین شهری که می‌شود شب را در آن ماند.</summary>
    internal City NearestStayCity(Coordinate near) =>
        StayCities.Count == 0
            ? OriginCity
            : StayCities.MinBy(c => near.StraightLineTo(c.Location).Kilometers) ?? OriginCity;
}

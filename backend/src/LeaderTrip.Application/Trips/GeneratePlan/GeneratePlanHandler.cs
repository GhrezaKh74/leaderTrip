using System.Globalization;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Advice;
using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Scoring;
using LeaderTrip.Domain.Specifications;
using LeaderTrip.Domain.Specifications.Poi;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Application.Trips.GeneratePlan;

/// <summary>ساخت برنامهٔ سفر — ارکستراسیون دامنه، بدون منطق کسب‌وکار.</summary>
/// <remarks>
/// این‌جا هیچ فرمولی نیست. مسئول فقط داده را می‌آورد، اجزای دامنه را به‌هم وصل
/// می‌کند و نتیجه را به شکل قابل انتقال درمی‌آورد. هر قاعده‌ای که این‌جا نوشته
/// شود، در دامنه جایش خالی است.
/// </remarks>
internal sealed class GeneratePlanHandler : IQueryHandler<GeneratePlanQuery, TripPlanResponse>
{
    /// <summary>بیشترین تعداد نقطه‌ای که برای ماتریس مسافت واقعی درخواست می‌شود.</summary>
    private const int RouteWarmupLimit = 60;

    private readonly ICityRepository _cities;
    private readonly IPoiRepository _pois;
    private readonly IVehicleRepository _vehicles;
    private readonly IPriceBookProvider _prices;
    private readonly IWeatherProvider _weather;
    private readonly IElevationProvider _elevation;
    private readonly IRoadNetworkWarmup _roadNetwork;
    private readonly PoiScorer _scorer;
    private readonly ItinerarySelector _selector;
    private readonly DayScheduler _scheduler;
    private readonly CostCalculator _costCalculator;

    public GeneratePlanHandler(
        ICityRepository cities,
        IPoiRepository pois,
        IVehicleRepository vehicles,
        IPriceBookProvider prices,
        IWeatherProvider weather,
        IElevationProvider elevation,
        IRoadNetworkWarmup roadNetwork,
        PoiScorer scorer,
        ItinerarySelector selector,
        DayScheduler scheduler,
        CostCalculator costCalculator)
    {
        _cities = cities;
        _pois = pois;
        _vehicles = vehicles;
        _prices = prices;
        _weather = weather;
        _elevation = elevation;
        _roadNetwork = roadNetwork;
        _scorer = scorer;
        _selector = selector;
        _scheduler = scheduler;
        _costCalculator = costCalculator;
    }

    public async Task<Result<TripPlanResponse>> HandleAsync(
        GeneratePlanQuery query,
        CancellationToken cancellationToken)
    {
        var origin = await _cities.FindAsync(query.OriginCityId, cancellationToken).ConfigureAwait(false);
        if (origin is null)
        {
            return Result.Failure<TripPlanResponse>(
                DomainError.NotFound("city.notFound", $"شهر «{query.OriginCityId}» پیدا نشد."));
        }

        var vehicle = await _vehicles.FindAsync(query.VehicleId, cancellationToken).ConfigureAwait(false);
        if (vehicle is null)
        {
            return Result.Failure<TripPlanResponse>(
                DomainError.NotFound("vehicle.notFound", $"خودروی «{query.VehicleId}» پیدا نشد."));
        }

        var groupResult = TravelGroup.Create(query.Travelers.Select(t =>
            new Traveler(t.Id, t.Name, t.Age, t.Mobility, t.IsDriver)));

        if (groupResult.IsFailure)
        {
            return Result.Failure<TripPlanResponse>(groupResult.Error);
        }

        var group = groupResult.Value;
        var cities = await _cities.GetAllAsync(cancellationToken).ConfigureAwait(false);
        var allPois = await _pois.GetAllAsync(cancellationToken).ConfigureAwait(false);
        var priceBook = await _prices.GetCurrentAsync(cancellationToken).ConfigureAwait(false);

        // آب‌وهوا اختیاری است: اگر سرویس نبود، `null` می‌ماند و قاعدهٔ آب‌وهوا
        // ضریب خنثی برمی‌گرداند. برنامه ساخته می‌شود، فقط کورتر.
        var outlook = await _weather
            .GetOutlookAsync(origin.Location, query.StartDate, query.Days, cancellationToken)
            .ConfigureAwait(false);

        var cityById = cities.ToDictionary(c => c.Id, StringComparer.Ordinal);
        var radius = Distance.FromKilometers(query.RadiusKm);
        var excluded = query.ExcludedPoiIds.ToHashSet(StringComparer.Ordinal);
        var pinned = query.PinnedPoiIds.ToHashSet(StringComparer.Ordinal);

        // ─── قیدهای سخت، به‌صورت ترکیبی ───
        var eligibility = Spec.All(
            new NotExcludedSpecification(excluded),
            new NotInHomeCitySpecification(origin.Id, query.Days),
            new VehicleCanReachSpecification(vehicle),
            new GroupCanHandleDifficultySpecification(group),
            new MinimumAgeSpecification(group),
            new InSeasonSpecification(query.StartDate.Month),
            new WithinRadiusSpecification(origin.Location, radius));

        var rejections = new Dictionary<string, string>(StringComparer.Ordinal);
        var candidates = new List<ScoredPoi>();

        var scoringContext = new ScoringContext
        {
            Group = group,
            Origin = origin.Location,
            SearchRadius = radius,
            Month = query.StartDate.Month,
            TripDays = query.Days,
            Interests = query.Interests.ToHashSet(),
            PinnedPoiIds = pinned,
            PerPersonDailyBudget = Money.FromToman(
                query.BudgetToman / Math.Max(1, group.Count * query.Days)),
            Weather = outlook,
            LearnedTaste = query.LearnedTaste,
        };

        foreach (var poi in allPois)
        {
            bool isPinned = pinned.Contains(poi.Id);
            var verdict = eligibility.Evaluate(poi);

            if (!verdict.IsSatisfied && !isPinned)
            {
                // فقط چیزهایی که داخل محدودهٔ سفرند ارزش گزارش دارند
                if (verdict.Reason is { } reason && !reason.Contains("شعاع", StringComparison.Ordinal))
                {
                    rejections[poi.Id] = reason;
                }

                continue;
            }

            candidates.Add(new ScoredPoi(poi, _scorer.Score(poi, scoringContext).Value));
        }

        // ─── پیش‌بارگذاری مسافت‌های واقعی ───
        // فقط برای نامزدهای برتر: سرویس‌های مسیریابی سقف اندازهٔ ماتریس دارند و
        // درخواست‌دادن برای هر ۱۴۳ جاذبه هم رد می‌شود هم بی‌فایده است — بیشترشان
        // هرگز به مسیر نمی‌رسند. سقف صریح است، نه بی‌صدا.
        var warmupPoints = candidates
            .OrderByDescending(c => c.Score)
            .Take(RouteWarmupLimit - 1)
            .Select(c => c.Poi.Location)
            .Prepend(origin.Location)
            .ToList();

        await _roadNetwork.WarmAsync(warmupPoints, cancellationToken).ConfigureAwait(false);

        // ─── انتخاب مسیر ───
        var climates = cities.ToDictionary(c => c.Id, c => c.Climate, StringComparer.Ordinal);
        var usable = TimeSpan.FromHours(query.DayEndHour - query.DayStartHour) - TimeSpan.FromMinutes(150);

        var route = _selector.Select(candidates, new SelectionRequest
        {
            Origin = origin.Location,
            OriginClimate = origin.Climate,
            Vehicle = vehicle,
            Days = query.Days,
            DailyDrivingCap = TimeSpan.FromHours(query.MaxDrivingHoursPerDay),
            UsableHoursPerDay = usable,
            ReturnsToOrigin = query.RoundTrip,
            Pace = group.PaceFactor,
            VisitStretch = group.VisitDurationFactor,
            PinnedPoiIds = pinned,
            CityClimates = climates,
        });

        // ─── زمان‌بندی روزها ───
        var schedule = _scheduler.Schedule(route, new ScheduleRequest
        {
            StartDate = query.StartDate,
            Days = query.Days,
            OriginCity = origin,
            Vehicle = vehicle,
            Style = query.Style,
            DayStart = TimeSpan.FromHours(query.DayStartHour),
            DayEnd = TimeSpan.FromHours(query.DayEndHour),
            DailyDrivingCap = TimeSpan.FromHours(query.MaxDrivingHoursPerDay),
            ReturnsToOrigin = query.RoundTrip,
            Pace = group.PaceFactor,
            VisitStretch = group.VisitDurationFactor,
            Cities = cityById,
            StayCities = cities.Where(c => c.CanStayOvernight).ToList(),
            DayAssignments = query.DayAssignments,
        });

        // ─── هزینه ───
        var scheduledIds = schedule.Days.SelectMany(d => d.VisitedPoiIds).ToHashSet(StringComparer.Ordinal);
        var visitedPois = allPois.Where(p => scheduledIds.Contains(p.Id)).ToList();

        var nightCities = schedule.Days
            .Take(Math.Max(0, query.Days - 1))
            .Where(d => !string.Equals(d.BaseCityId, origin.Id, StringComparison.Ordinal))
            .Select(d => cityById[d.BaseCityId])
            .ToList();

        var totalDistance = schedule.Days.Aggregate(Distance.Zero, (sum, d) => sum + d.Distance);

        var cost = _costCalculator.Calculate(new CostContext
        {
            Group = group,
            Vehicle = vehicle,
            Prices = priceBook,
            Style = query.Style,
            Lodging = query.Lodging,
            TotalDistance = totalDistance,
            MountainShare = 0,
            VehicleCount = query.VehicleCount,
            SubsidizedFuelShare = query.SubsidizedFuelShare,
            NightCities = nightCities,
            VisitedPois = visitedPois,
            Days = query.Days,
            Month = query.StartDate.Month,
        });

        // ─── نشاندن هزینه روی روزها ───
        // بدون این گام، هر روز «۰ تومان» است — و صفر روی صفحه یعنی «رایگان»،
        // نه «هنوز حساب نشده».
        decimal ticketWeight = group.Travelers.Sum(t => AgeFactors.Ticket(t.Age));
        var ticketPerPoi = visitedPois.ToDictionary(
            p => p.Id,
            p => Money.FromToman(p.Ticket.Amount * ticketWeight),
            StringComparer.Ordinal);

        var attributedDays = CostAttribution.Attribute(schedule.Days, cost, ticketPerPoi);

        // ─── ارتفاع مسیر ───
        // نقاط بازدید نمونهٔ مسیرند، نه خودِ مسیر. برای هشدار گردنه کافی است:
        // جاذبه‌ای که بالای ۲۰۰۰ متر است، جاده‌اش هم از ارتفاع می‌گذرد.
        var routePoints = visitedPois.Select(p => p.Location).Prepend(origin.Location).Distinct().ToList();
        var elevations = await _elevation.GetAsync(routePoints, cancellationToken).ConfigureAwait(false);
        double? peakElevation = elevations.Count > 0 ? elevations.Max() : null;

        // ─── هوای روزبه‌روز، برای نمایش ───
        var dailyWeather = await _weather
            .GetDailyAsync(origin.Location, query.StartDate, query.Days, cancellationToken)
            .ConfigureAwait(false);

        // ─── مشاور و چک‌لیست ───
        var tripClimates = attributedDays
            .Select(d => cityById.TryGetValue(d.BaseCityId, out var city) ? city.Climate : origin.Climate)
            .Append(origin.Climate)
            .Distinct()
            .ToList();

        var advice = Advisor.Advise(new AdviceContext
        {
            Group = group,
            Vehicle = vehicle,
            Days = attributedDays,
            VisitedPois = visitedPois,
            Cost = cost,
            Budget = Money.FromToman(query.BudgetToman),
            DailyDrivingCap = TimeSpan.FromHours(query.MaxDrivingHoursPerDay),
            Month = query.StartDate.Month,
            Climates = tripClimates,
            VehicleCount = query.VehicleCount,
            PeakElevationMetres = peakElevation,
        });

        var packing = PackingList.Build(new PackingContext
        {
            Group = group,
            Vehicle = vehicle,
            Lodging = query.Lodging,
            Month = query.StartDate.Month,
            Climates = tripClimates,
            VisitedPois = visitedPois,
            Nights = Math.Max(0, query.Days - 1),
        });

        return Map(
            schedule with { Days = attributedDays },
            cost,
            totalDistance,
            query.BudgetToman,
            advice,
            packing,
            dailyWeather);
    }

    private static TripPlanResponse Map(
        ScheduleResult schedule,
        CostBreakdown cost,
        Distance totalDistance,
        decimal budget,
        IReadOnlyList<Advice> advice,
        IReadOnlyList<PackingItem> packing,
        IReadOnlyList<DailyWeather> weather)
    {
        var weatherByDate = weather.ToDictionary(w => w.Date);

        var days = schedule.Days.Select(day => new DayPlanDto(
            day.Index,
            day.Date,
            day.BaseCityId,
            day.Blocks.Select(b => new PlanBlockDto(
                b.Kind,
                b.StartsAt.ToString(@"hh\:mm", CultureInfo.InvariantCulture),
                b.Duration.TotalMinutes,
                b.Title,
                b.Cost.Amount,
                b.PoiId,
                b.DistanceCovered?.Kilometers,
                b.Note)).ToList(),
            day.Distance.Kilometers,
            day.DrivingTime.TotalMinutes,
            day.Cost.Amount,
            weatherByDate.TryGetValue(day.Date, out var forecast)
                ? new DayWeatherDto(
                    forecast.MaxTemperature,
                    forecast.MinTemperature,
                    forecast.PrecipitationProbability,
                    forecast.HasSnow,
                    forecast.IsForecast)
                : null)).ToList();

        var costDto = new CostBreakdownDto(
            cost.Lines.Select(l => new CostLineDto(l.Key, l.Label, l.Amount.Amount, l.Formula)).ToList(),
            cost.Subtotal.Amount,
            cost.Miscellaneous.Amount,
            cost.RiskBuffer.Amount,
            cost.Total.Amount,
            cost.PerPerson.Amount,
            cost.Optimistic.Amount,
            cost.Pessimistic.Amount,
            cost.Total.Amount - budget);

        return new TripPlanResponse
        {
            Days = days,
            Cost = costDto,
            TotalKilometers = totalDistance.Kilometers,
            TotalDrivingMinutes = schedule.Days.Sum(d => d.DrivingTime.TotalMinutes),
            VisitCount = schedule.Days.Sum(d => d.VisitedPoiIds.Count),
            UnscheduledPoiIds = schedule.UnscheduledPoiIds,
            DistanceSource = schedule.DistanceSource,
            Advice = [.. advice.Select(a => new AdviceDto(a.Code, a.Level.ToString(), a.Title, a.Detail))],
            Packing = [.. packing.Select(p => new PackingItemDto(p.Group, p.Item, p.Reason))],
        };
    }
}

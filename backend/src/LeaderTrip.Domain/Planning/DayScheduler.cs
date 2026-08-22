using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Planning;

/// <summary>ترتیب بازدیدها را به برنامهٔ ساعت‌به‌ساعت روزها تبدیل می‌کند.</summary>
/// <remarks>
/// <para>
/// قید سخت: مجموع رانندگی هر روز از سقف تعیین‌شده بیشتر نمی‌شود. جاذبه‌ای که
/// جا نشود به روز بعد می‌رود؛ اگر تا آخر جا نشد، صریحاً گزارش می‌شود — نه اینکه
/// بی‌صدا حذف شود.
/// </para>
/// <para>
/// در هر گام، <em>نخستین جاذبهٔ شدنی</em> از صف برداشته می‌شود، نه فقط نفر اول
/// صف: اگر جاذبهٔ بعدیِ مسیر امروز جا نشود (رانندگی‌اش سقف روز را می‌ترکاند یا
/// درش بسته است) نوبت به بعدی‌ها می‌رسد. بدون این، روز ساعت سه بعدازظهر تمام
/// می‌شد در حالی که جاذبهٔ نزدیکِ چند دقیقه‌ای در صف مانده بود — بعدازظهرِ مرده
/// و «جا نشد» هم‌زمان.
/// </para>
/// </remarks>
public sealed class DayScheduler
{
    private static readonly TimeSpan Breakfast = TimeSpan.FromMinutes(45);
    private static readonly TimeSpan Dinner = TimeSpan.FromMinutes(75);
    private static readonly TimeSpan RestStop = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan ContinuousDriveLimit = TimeSpan.FromMinutes(120);
    private static readonly TimeSpan LunchWindowStart = TimeSpan.FromHours(12);
    private static readonly TimeSpan LunchWindowEnd = TimeSpan.FromHours(14.5);
    private static readonly TimeSpan EarlyLunchStart = TimeSpan.FromHours(11);
    private static readonly TimeSpan LateLunchLimit = TimeSpan.FromHours(16);
    private static readonly TimeSpan DinnerTime = TimeSpan.FromHours(19);
    private static readonly TimeSpan DinnerWindowEnd = TimeSpan.FromHours(21);
    private static readonly TimeSpan MaxOpeningWait = TimeSpan.FromMinutes(90);
    private static readonly TimeSpan VisibleWait = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan FreeTimeThreshold = TimeSpan.FromMinutes(60);
    private static readonly TimeSpan MinEveningVisit = TimeSpan.FromMinutes(40);
    private static readonly TimeSpan CheckInRest = TimeSpan.FromMinutes(60);
    private static readonly TimeSpan MiddayRestTime = TimeSpan.FromMinutes(45);
    private static readonly TimeSpan LateVisitCutoff = TimeSpan.FromHours(19.5);
    private static readonly Distance EveningReach = Distance.FromKilometers(8);

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
        var visitedIds = new HashSet<string>(StringComparer.Ordinal);
        var checkedIn = new HashSet<string>(StringComparer.Ordinal);
        var lastNightCity = request.OriginCity;
        var current = request.Origin;
        var currentCity = request.OriginCity;
        bool anyRouted = false;
        bool anyEstimated = false;
        // سهم کیلومترهای کوهستانی — خوراک ضریب مصرف سوخت در FuelCost؛ تا پیش
        // از این هاردکدِ صفر بود و کل آن زیرساخت، کد مرده.
        double mountainKilometers = 0;
        double totalLegKilometers = 0;

        for (int dayIndex = 0; dayIndex < request.Days; dayIndex++)
        {
            bool isLastDay = dayIndex == request.Days - 1;
            var blocks = new List<PlanBlock>();
            var clock = dayIndex == 0 && request.FirstDayStart is { } firstStart
                ? firstStart
                : request.DayStart;
            var driving = TimeSpan.Zero;
            var continuous = TimeSpan.Zero;
            var dayDistance = Distance.Zero;
            bool lunchDone = false;
            bool dinnerDone = false;
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
                if (request.MaxVisitsPerDay is { } visitCap && visited.Count >= visitCap)
                {
                    break;
                }

                // جابه‌جایی دستی به‌صورت قید ورودی اعمال می‌شود، نه دستکاری خروجی:
                // اگر کاربر گفته این جاذبه روز سوم باشد، در روزهای دیگر رد می‌شود
                // و برنامه از نو و سازگار ساخته می‌شود. دستکاری مستقیم خروجی یعنی
                // مسافت و ساعت و هزینه با آنچه نمایش داده می‌شود نخواند.
                var placement = FirstFeasible(
                    pending, request, dayIndex + 1, isLastDay, current, currentCity, clock, driving, continuous,
                    lunchDone, dinnerDone, lastNightCity, checkedIn);

                if (placement is null)
                {
                    break;
                }

                var (node, leg, visit, visitStart, restBefore, restsWithin, meal, checkInCity) = placement;
                var next = node.Value;

                pending.Remove(node);

                if (restBefore)
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

                // مدت بلوک، زمانِ واقعیِ در راه است — توقف‌های میان‌راهی داخلش؛
                // آمار «رانندگی» فقط خودِ رانندگی را می‌شمارد.
                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Drive,
                    StartsAt = clock,
                    Duration = leg.Duration + RestStop * restsWithin,
                    Title = $"حرکت به {next.Name}",
                    Cost = Money.Zero,
                    DistanceCovered = leg.Road,
                    Note = DriveNote(leg, restsWithin),
                });

                clock += leg.Duration + RestStop * restsWithin;
                driving += leg.Duration;
                continuous += leg.Duration;
                dayDistance += leg.Road;
                TrackSource(leg, ref anyRouted, ref anyEstimated, ref mountainKilometers, ref totalLegKilometers);

                if (checkInCity is { } hotelCity)
                {
                    // اول تحویل اقامتگاه: رسیدیم به شهرِ خواب، بار را می‌گذاریم و
                    // نفسی می‌گیریم — گشتِ شهر بعدش شروع می‌شود.
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Rest,
                        StartsAt = clock,
                        Duration = CheckInRest,
                        Title = $"تحویل اقامتگاه و استراحت در {hotelCity.Name}",
                        Cost = Money.Zero,
                    });
                    clock += CheckInRest;
                    checkedIn.Add(hotelCity.Id);
                }

                if (meal != MealBefore.None)
                {
                    var mealTime = meal == MealBefore.Dinner ? Dinner : LunchTime(request);
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Meal,
                        StartsAt = clock,
                        Duration = mealTime,
                        Title = meal == MealBefore.Dinner
                            ? "شام"
                            : request.PicnicLunch ? "ناهار (همراه)" : "ناهار",
                        Cost = Money.Zero,
                    });
                    clock += mealTime;

                    if (meal == MealBefore.Dinner)
                    {
                        dinnerDone = true;
                    }
                    else
                    {
                        lunchDone = true;

                        if (request.MiddayRest)
                        {
                            blocks.Add(new PlanBlock
                            {
                                Kind = BlockKind.Rest,
                                StartsAt = clock,
                                Duration = MiddayRestTime,
                                Title = "استراحت بعد از ناهار",
                                Cost = Money.Zero,
                            });
                            clock += MiddayRestTime;
                        }
                    }
                }

                // درِ بسته: اگر رسیدیم و هنوز باز نشده، انتظارِ محسوس صریح در
                // برنامه می‌آید — نه گپ بی‌توضیح، نه بازدید از پشت درِ بسته.
                if (visitStart - clock >= VisibleWait)
                {
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Rest,
                        StartsAt = clock,
                        Duration = visitStart - clock,
                        Title = $"وقت آزاد تا بازشدن {next.Name}",
                        Cost = Money.Zero,
                    });
                }

                clock = visitStart;

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
                visitedIds.Add(next.Id);
                current = next.Location;
                currentCity = request.CityOf(next);
            }

            var stayCity = isLastDay
                ? request.FinalCity(fallbackNear: visited.Count > 0 ? visited[^1].Location : current)
                : visited.Count > 0
                    ? request.NearestStayCity(visited[^1].Location)
                    // روزِ بی‌بازدید ولی با کارِ مانده: به‌جای درجازدن، تا جایی
                    // که سقف رانندگی اجازه می‌دهد به سمت نخستین توقفِ مانده
                    // پیش می‌رویم و شب را در شهرِ میانی می‌مانیم — وگرنه
                    // روزهای وسط خالی می‌ماندند و روز آخر یک پای غول‌آسا می‌شد.
                    : ProgressStayCity(request, current, currentCity, pending.First?.Value, request.DailyDrivingCap - driving);

            if (!string.Equals(stayCity.Id, currentCity.Id, StringComparison.Ordinal))
            {
                var terrain = TravelPlanner.InferTerrain(
                    currentCity.Climate, stayCity.Climate, current.StraightLineTo(stayCity.Location));
                var leg = _travelPlanner.Plan(current, stayCity.Location, terrain, request.Vehicle, request.Pace);

                // ناهار پیش از پای انتقال: بدون این، گروهی که ظهر راه می‌افتد
                // (به‌خصوص برگشتِ روز آخر) کل پنجرهٔ ناهار را پشت فرمان می‌گذراند.
                if (!lunchDone && clock >= EarlyLunchStart && clock <= LunchWindowEnd
                    && leg.Duration >= TimeSpan.FromMinutes(45))
                {
                    var lunch = LunchTime(request);
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Meal,
                        StartsAt = clock,
                        Duration = lunch,
                        Title = request.PicnicLunch ? "ناهار (همراه)" : "ناهار",
                        Cost = Money.Zero,
                        Note = currentCity.Name,
                    });
                    clock += lunch;
                    lunchDone = true;

                    if (request.MiddayRest)
                    {
                        blocks.Add(new PlanBlock
                        {
                            Kind = BlockKind.Rest,
                            StartsAt = clock,
                            Duration = MiddayRestTime,
                            Title = "استراحت بعد از ناهار",
                            Cost = Money.Zero,
                        });
                        clock += MiddayRestTime;
                    }
                }

                var (restBefore, restsWithin) = RestPlan(continuous, leg.Duration);

                if (restBefore)
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
                }

                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Drive,
                    StartsAt = clock,
                    Duration = leg.Duration + RestStop * restsWithin,
                    Title = isLastDay && request.ReturnsToOrigin
                        ? $"بازگشت به {stayCity.Name}"
                        : isLastDay && request.DestinationCity is not null
                            ? $"رسیدن به مقصد: {stayCity.Name}"
                            : $"حرکت به {stayCity.Name}",
                    Cost = Money.Zero,
                    DistanceCovered = leg.Road,
                    Note = DriveNote(leg, restsWithin),
                });

                clock += leg.Duration + RestStop * restsWithin;
                driving += leg.Duration;
                dayDistance += leg.Road;
                TrackSource(leg, ref anyRouted, ref anyEstimated, ref mountainKilometers, ref totalLegKilometers);
                current = stayCity.Location;
                currentCity = stayCity;
                continuous = TimeSpan.Zero;
            }

            bool staysOvernight = dayIndex < request.Days - 1
                && !string.Equals(stayCity.Id, request.OriginCity.Id, StringComparison.Ordinal);

            if (staysOvernight)
            {
                var eveningEnd = clock;

                if (!lunchDone && clock >= EarlyLunchStart && clock <= LateLunchLimit)
                {
                    var lunch = LunchTime(request);
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Meal,
                        StartsAt = Max(clock, LunchWindowStart),
                        Duration = lunch,
                        Title = request.PicnicLunch ? "ناهار (همراه)" : "ناهار",
                        Cost = Money.Zero,
                        Note = stayCity.Name,
                    });
                    clock = Max(clock, LunchWindowStart) + lunch;
                    lunchDone = true;

                    if (request.MiddayRest)
                    {
                        blocks.Add(new PlanBlock
                        {
                            Kind = BlockKind.Rest,
                            StartsAt = clock,
                            Duration = MiddayRestTime,
                            Title = "استراحت بعد از ناهار",
                            Cost = Money.Zero,
                        });
                        clock += MiddayRestTime;
                    }
                }

                if (!dinnerDone)
                {
                    // فاصلهٔ محسوس تا شام، بلوک صریح می‌گیرد: برنامه‌ای که ساعت
                    // پنج «تمام می‌شود» و ساعت هفت شام دارد، ناقص به نظر می‌رسد
                    // — در حالی که همان وقتِ آزادِ عصر است و باید همین را بگوید.
                    if (clock < DinnerTime && DinnerTime - clock >= FreeTimeThreshold)
                    {
                        blocks.Add(new PlanBlock
                        {
                            Kind = BlockKind.Rest,
                            StartsAt = clock,
                            Duration = DinnerTime - clock,
                            Title = $"وقت آزاد و استراحت در {stayCity.Name}",
                            Cost = Money.Zero,
                        });
                    }

                    var dinnerStart = Max(clock, DinnerTime);

                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Meal,
                        StartsAt = dinnerStart,
                        Duration = Dinner,
                        Title = "شام",
                        Cost = Money.Zero,
                        Note = stayCity.Name,
                    });

                    eveningEnd = dinnerStart + Dinner;
                }
                var evening = request.EveningProgram
                    ? PickEveningVisit(request, stayCity, visitedIds, eveningEnd)
                    : null;

                if (evening is { } stroll)
                {
                    blocks.Add(new PlanBlock
                    {
                        Kind = BlockKind.Visit,
                        StartsAt = eveningEnd,
                        Duration = stroll.Duration,
                        Title = stroll.Poi.Name,
                        Cost = Money.Zero,
                        PoiId = stroll.Poi.Id,
                        Note = "گشت شبانه",
                    });

                    eveningEnd += stroll.Duration;
                    visitedIds.Add(stroll.Poi.Id);
                    visited.Add(stroll.Poi);
                    RemoveById(pending, stroll.Poi.Id);
                }

                blocks.Add(new PlanBlock
                {
                    Kind = BlockKind.Lodging,
                    StartsAt = Max(eveningEnd, TimeSpan.FromHours(21)),
                    Duration = TimeSpan.Zero,
                    Title = $"اقامت شب در {stayCity.Name}",
                    Cost = Money.Zero,
                });
            }

            if (!isLastDay)
            {
                lastNightCity = stayCity;
                checkedIn.Add(stayCity.Id);
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
        return new ScheduleResult(
            days,
            pending.Select(p => p.Id).ToList(),
            source,
            totalLegKilometers > 0 ? mountainKilometers / totalLegKilometers : 0);
    }

    /// <summary>گزینهٔ گشت شبانه بعد از شام.</summary>
    private sealed record EveningStroll(PointOfInterest Poi, TimeSpan Duration);

    /// <summary>
    /// جاذبهٔ شب‌مناسبِ شهرِ اقامت برای بعد از شام — اگر باشد و بگنجد.
    /// </summary>
    /// <remarks>
    /// شب در سفر ایرانی وقتِ مرده نیست: بازار، پل‌های اصفهان، میدان نقش جهان.
    /// فقط جاذبه‌های همان شهر و در دسترسِ پیاده/چنددقیقه‌ای انتخاب می‌شوند تا
    /// «گشت شبانه» رانندگی شبانه نشود؛ به همین دلیل هم بلوک رانندگی ندارد.
    /// </remarks>
    private static EveningStroll? PickEveningVisit(
        ScheduleRequest request,
        City stayCity,
        HashSet<string> visitedIds,
        TimeSpan start)
    {
        var available = request.DayEnd - start;

        if (available < MinEveningVisit)
        {
            return null;
        }

        var pick = request.NightPois
            .Where(poi => !visitedIds.Contains(poi.Id)
                && string.Equals(poi.CityId, stayCity.Id, StringComparison.Ordinal)
                && poi.Location.StraightLineTo(stayCity.Location) <= EveningReach
                && poi.EarliestVisitStart(start, MinEveningVisit) == start)
            .OrderByDescending(poi => poi.Rating)
            .FirstOrDefault();

        if (pick is null)
        {
            return null;
        }

        var stretched = TimeSpan.FromMinutes(pick.VisitDuration.TotalMinutes * request.VisitStretch);
        var closingLimit = pick.ClosesAt is { } closes ? closes - start : available;
        var duration = Min(stretched, Min(available, closingLimit));

        return duration < MinEveningVisit ? null : new EveningStroll(pick, duration);
    }

    private static void RemoveById(LinkedList<PointOfInterest> pending, string id)
    {
        for (var node = pending.First; node is not null; node = node.Next)
        {
            if (string.Equals(node.Value.Id, id, StringComparison.Ordinal))
            {
                pending.Remove(node);

                return;
            }
        }
    }

    private static TimeSpan Min(TimeSpan left, TimeSpan right) => left < right ? left : right;

    /// <summary>مدت ناهار: پیک‌نیک کوتاه است؛ رستوران به سبک سفر بسته است.</summary>
    private static TimeSpan LunchTime(ScheduleRequest request) =>
        request.PicnicLunch
            ? TimeSpan.FromMinutes(30)
            : TimeSpan.FromMinutes(request.Style == TravelStyle.Budget ? 60 : 75);

    private static void TrackSource(
        TravelLeg leg,
        ref bool anyRouted,
        ref bool anyEstimated,
        ref double mountainKilometers,
        ref double totalLegKilometers)
    {
        if (leg.Source == DistanceSource.Routed)
        {
            anyRouted = true;
        }
        else
        {
            anyEstimated = true;
        }

        totalLegKilometers += leg.Road.Kilometers;

        if (leg.Terrain == Terrain.Mountain)
        {
            mountainKilometers += leg.Road.Kilometers;
        }
    }

    /// <summary>
    /// شهرِ خواب برای روزِ انتقال: بیشترین پیشروی به سمت هدفِ بعدی، درون سقفِ
    /// باقی‌ماندهٔ رانندگی.
    /// </summary>
    /// <remarks>
    /// اگر هدفی نمانده یا هیچ شهری پیشرویِ معنادار (بیش از ۲۵ کیلومتر) نمی‌دهد،
    /// همان شهرِ فعلی می‌ماند — روزِ آرامِ سفرِ حلقه‌ای اشکالی ندارد؛ درجازدنِ
    /// سفرِ مقصددار اشکال دارد.
    /// </remarks>
    private City ProgressStayCity(
        ScheduleRequest request,
        Coordinate current,
        City currentCity,
        PointOfInterest? nextPending,
        TimeSpan remainingDrive)
    {
        var target = nextPending?.Location ?? request.DestinationCity?.Location;

        if (target is not { } goal || remainingDrive <= TimeSpan.Zero)
        {
            return currentCity;
        }

        var currentGap = current.StraightLineTo(goal);
        City best = currentCity;
        var bestGap = currentGap;

        foreach (var city in request.StayCities)
        {
            if (string.Equals(city.Id, currentCity.Id, StringComparison.Ordinal))
            {
                continue;
            }

            var gap = city.Location.StraightLineTo(goal);

            // پیشرویِ معنادار، نه جابه‌جایی بین دو شهر هم‌فاصله.
            if (gap.Kilometers >= bestGap.Kilometers - 25)
            {
                continue;
            }

            var terrain = TravelPlanner.InferTerrain(
                currentCity.Climate, city.Climate, current.StraightLineTo(city.Location));
            var leg = _travelPlanner.Plan(current, city.Location, terrain, request.Vehicle, request.Pace);

            if (leg.Duration > remainingDrive)
            {
                continue;
            }

            best = city;
            bestGap = gap;
        }

        return best;
    }

    private static TimeSpan Max(TimeSpan left, TimeSpan right) => left > right ? left : right;

    /// <summary>وعده‌ای که پیش از بازدید بعدی باید خورده شود.</summary>
    private enum MealBefore
    {
        None,
        Lunch,
        Dinner,
    }

    /// <summary>نتیجهٔ سنجش یک جاذبه برای جایگاه بعدی روز.</summary>
    private sealed record Placement(
        LinkedListNode<PointOfInterest> Node,
        TravelLeg Leg,
        TimeSpan Visit,
        TimeSpan VisitStart,
        bool RestBefore,
        int RestsWithin,
        MealBefore Meal,
        City? CheckInCity);

    /// <summary>
    /// توقف‌های استراحتِ یک پای رانندگی: پیش از حرکت فقط وقتی که از قبل پشت
    /// فرمان بوده‌ایم؛ پای بلند، توقف‌هایش را وسط راه دارد نه اول صبح.
    /// </summary>
    private static (bool Before, int Within) RestPlan(TimeSpan continuous, TimeSpan leg)
    {
        bool before = continuous > TimeSpan.Zero && continuous + leg > ContinuousDriveLimit;
        var counted = before ? leg : continuous + leg;

        // پای دقیقاً دوساعته توقف نمی‌خواهد؛ فقط عبور از مرز
        int within = (int)(counted / ContinuousDriveLimit);
        if (within > 0 && counted == ContinuousDriveLimit * within)
        {
            within--;
        }

        return (before, within);
    }

    private static string? DriveNote(TravelLeg leg, int restsWithin)
    {
        string? mountain = leg.Terrain == Terrain.Mountain ? "مسیر کوهستانی" : null;
        string? rests = restsWithin switch
        {
            0 => null,
            1 => "با یک توقف استراحت بین راه",
            _ => $"با {restsWithin} توقف استراحت بین راه",
        };

        return (mountain, rests) switch
        {
            (null, null) => null,
            (not null, null) => mountain,
            (null, not null) => rests,
            _ => $"{mountain}؛ {rests}",
        };
    }

    /// <summary>
    /// نخستین جاذبهٔ صف که واقعاً در ادامهٔ امروز جا می‌شود.
    /// </summary>
    /// <remarks>
    /// ترتیب کلی مسیر حفظ می‌شود، ولی «نشدنی» رد می‌شود نه اینکه روز را تمام
    /// کند: جاذبه‌ای که رانندگی‌اش سقف امروز را می‌ترکاند، درش بسته است، یا به
    /// روز دیگری سنجاق شده، نوبت را به بعدیِ صف می‌دهد. جاذبهٔ سنجاق‌شده به
    /// روز دیگر قید کاربر است و همیشه رد می‌شود؛ بقیه فقط برای امروز.
    /// </remarks>
    private Placement? FirstFeasible(
        LinkedList<PointOfInterest> pending,
        ScheduleRequest request,
        int dayNumber,
        bool isLastDay,
        Coordinate current,
        City currentCity,
        TimeSpan clock,
        TimeSpan driving,
        TimeSpan continuous,
        bool lunchDone,
        bool dinnerDone,
        City lastNightCity,
        HashSet<string> checkedIn)
    {
        for (var node = pending.First; node is not null; node = node.Next)
        {
            var next = node.Value;

            if (request.DayAssignments.TryGetValue(next.Id, out int assigned) && assigned != dayNumber)
            {
                continue;
            }

            var terrain = TravelPlanner.InferTerrain(
                currentCity.Climate, request.ClimateOf(next), current.StraightLineTo(next.Location));
            var leg = _travelPlanner.Plan(current, next.Location, terrain, request.Vehicle, request.Pace);

            var (restBefore, restsWithin) = RestPlan(continuous, leg.Duration);
            var arrive = clock
                + (restBefore ? RestStop : TimeSpan.Zero)
                + leg.Duration
                + RestStop * restsWithin;

            // «اول تحویل اقامتگاه»: نخستین ورود به شهری که امشب در آن می‌خوابیم
            var poiCity = request.CityOf(next);
            var checkInCity = request.CheckInFirst
                && (!isLastDay || !request.ReturnsToOrigin)
                && !string.Equals(poiCity.Id, request.OriginCity.Id, StringComparison.Ordinal)
                && !string.Equals(poiCity.Id, lastNightCity.Id, StringComparison.Ordinal)
                && !checkedIn.Contains(poiCity.Id)
                && request.IsStayCity(poiCity.Id)
                && string.Equals(
                    (isLastDay ? request.FinalCity(next.Location) : request.NearestStayCity(next.Location)).Id,
                    poiCity.Id,
                    StringComparison.Ordinal)
                ? poiCity
                : null;

            var checkIn = checkInCity is null ? TimeSpan.Zero : CheckInRest;

            // شام مثل ناهار وسط برنامه پنجره دارد: بدون آن، زنجیرهٔ بازدیدهای
            // شبانه شام را تا نیمه‌شب هل می‌داد.
            var afterCheckIn = arrive + checkIn;

            // پای بلندی که کل پنجرهٔ ناهار را می‌بلعد نباید گروه را بی‌ناهار
            // بگذارد: تا ساعت ۴ بعدازظهر، ناهارِ دیر بهتر از هیچ است.
            bool lunchSlot = !lunchDone && afterCheckIn >= LunchWindowStart
                && (afterCheckIn <= LunchWindowEnd
                    || (clock <= LunchWindowEnd && afterCheckIn <= LateLunchLimit));
            var meal = lunchSlot
                ? MealBefore.Lunch
                : !dinnerDone && afterCheckIn >= DinnerTime && afterCheckIn <= DinnerWindowEnd
                    ? MealBefore.Dinner
                    : MealBefore.None;

            var mealTime = meal switch
            {
                MealBefore.Lunch => LunchTime(request)
                    + (request.MiddayRest ? MiddayRestTime : TimeSpan.Zero),
                MealBefore.Dinner => Dinner,
                _ => TimeSpan.Zero,
            };

            var visit = TimeSpan.FromMinutes(next.VisitDuration.TotalMinutes * request.VisitStretch);
            var visitStart = next.EarliestVisitStart(afterCheckIn + mealTime, visit);

            // در بسته است، یا انتظارش آن‌قدر طولانی که روز را حرام می‌کند
            if (visitStart is null || visitStart.Value - (afterCheckIn + mealTime) > MaxOpeningWait)
            {
                continue;
            }

            // شبِ بی‌برنامه: بازدید آخرشب فقط وقتی که کاربر شب‌گردی خواسته
            if (!request.EveningProgram && visitStart.Value >= LateVisitCutoff)
            {
                continue;
            }

            var endCity = isLastDay
                ? request.FinalCity(fallbackNear: next.Location)
                : request.NearestStayCity(next.Location);

            var back = _travelPlanner.Plan(
                next.Location,
                endCity.Location,
                TravelPlanner.InferTerrain(
                    request.ClimateOf(next), endCity.Climate, next.Location.StraightLineTo(endCity.Location)),
                request.Vehicle,
                request.Pace);

            if (driving + leg.Duration + back.Duration > request.DailyDrivingCap
                || visitStart.Value + visit + back.Duration > request.DayEnd)
            {
                continue;
            }

            return new Placement(node, leg, visit, visitStart.Value, restBefore, restsWithin, meal, checkInCity);
        }

        return null;
    }
}

/// <summary>خروجی زمان‌بندی.</summary>
public sealed record ScheduleResult(
    IReadOnlyList<DayPlan> Days,
    IReadOnlyList<string> UnscheduledPoiIds,
    DistanceSource DistanceSource,
    double MountainShare = 0);

/// <summary>پارامترهای زمان‌بندی روزها.</summary>
public sealed record ScheduleRequest
{
    public required DateOnly StartDate { get; init; }

    public required int Days { get; init; }

    public required City OriginCity { get; init; }

    /// <summary>مقصد سفر؛ <see langword="null"/> یعنی سفر حلقه‌ای دور مبدأ.</summary>
    public City? DestinationCity { get; init; }

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

    /// <summary>
    /// جاذبه‌های شب‌مناسبِ نامزد برای گشتِ بعد از شام — می‌تواند فراتر از
    /// مسیر انتخاب‌شده باشد؛ بازدیدشدهٔ روز، شب دوباره پیشنهاد نمی‌شود.
    /// </summary>
    public IReadOnlyList<PointOfInterest> NightPois { get; init; } = [];

    // ─── ترجیحات روز ───

    /// <summary>اول تحویل اقامتگاه و استراحت، بعد گشتِ شهرِ اقامت.</summary>
    public bool CheckInFirst { get; init; }

    /// <summary>استراحت کوتاه بعد از هر ناهار.</summary>
    public bool MiddayRest { get; init; }

    /// <summary>خاموش یعنی بعد از شام هیچ برنامه‌ای نمی‌نشیند و بازدید آخرشب نداریم.</summary>
    public bool EveningProgram { get; init; } = true;

    /// <summary>سقف بازدیدهای روز؛ <see langword="null"/> یعنی هرچه جا شود.</summary>
    public int? MaxVisitsPerDay { get; init; }

    /// <summary>ناهار پیک‌نیکی: توقف کوتاه‌تر.</summary>
    public bool PicnicLunch { get; init; }

    /// <summary>ساعت شروع روز اول اگر با بقیه فرق دارد.</summary>
    public TimeSpan? FirstDayStart { get; init; }

    internal bool IsStayCity(string cityId) =>
        StayCities.Any(c => string.Equals(c.Id, cityId, StringComparison.Ordinal));

    public Coordinate Origin => OriginCity.Location;

    internal City CityOf(PointOfInterest poi) =>
        Cities.TryGetValue(poi.CityId, out var city) ? city : OriginCity;

    internal Climate ClimateOf(PointOfInterest poi) => CityOf(poi).Climate;

    /// <summary>نزدیک‌ترین شهری که می‌شود شب را در آن ماند.</summary>
    internal City NearestStayCity(Coordinate near) =>
        StayCities.Count == 0
            ? OriginCity
            : StayCities.MinBy(c => near.StraightLineTo(c.Location).Kilometers) ?? OriginCity;

    /// <summary>
    /// شهرِ پایان سفر: مبدأ اگر برگشتی است، مقصد اگر مقصددار است، وگرنه
    /// نزدیک‌ترین شهرِ ماندنی به نقطهٔ داده‌شده.
    /// </summary>
    internal City FinalCity(Coordinate fallbackNear) =>
        ReturnsToOrigin
            ? OriginCity
            : DestinationCity ?? NearestStayCity(fallbackNear);
}

using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Reference.DiscoverPlaces;
using LeaderTrip.Application.Reference.GetPois;
using LeaderTrip.Application.Reference.GetReferenceData;
using LeaderTrip.Application.Trips.GeneratePlan;
using LeaderTrip.Application.Trips.OptimizeBudget;
using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Api.Endpoints;

/// <summary>یک نقطهٔ جغرافیایی در قرارداد HTTP.</summary>
public sealed record MapPointDto(double Lat, double Lng);

/// <summary>درخواست هندسهٔ مسیر: توقف‌ها به ترتیب پیمایش.</summary>
public sealed record RoutePathRequest(IReadOnlyList<MapPointDto> Points);

/// <summary>
/// پاسخ هندسهٔ مسیر. <see cref="Source"/> صادق است: «Routed» یعنی نقاط از
/// شبکهٔ واقعی جاده آمده‌اند؛ «Straight» یعنی سرویس در دسترس نبود و کلاینت
/// باید خط مستقیم بکشد و همان را برچسب بزند.
/// </summary>
public sealed record RoutePathResponse(IReadOnlyList<MapPointDto> Points, string Source);

/// <summary>اندپوینت‌های عمومی.</summary>
/// <remarks>
/// هر اندپوینت فقط ترجمه است: درخواست HTTP به پرسش، و نتیجه به پاسخ. هیچ منطقی
/// این‌جا نیست — منطقی که این‌جا نوشته شود، در تست‌های دامنه دیده نمی‌شود و از
/// راه دیگری (مثلاً یک کار زمان‌بندی‌شده) اصلاً اجرا نمی‌شود.
/// </remarks>
internal static class TripEndpoints
{
    public static void MapTripEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api").WithTags("LeaderTrip");

        api.MapGet("/reference", async (IDispatcher dispatcher, CancellationToken cancellationToken) =>
                (await dispatcher.QueryAsync(new GetReferenceDataQuery(), cancellationToken)).ToHttpResult())
            .WithName("GetReferenceData")
            .WithSummary("شهرها، خودروها و قیمت‌های پایه")
            .WithDescription("هرچه ویزارد برای پرکردن فرم لازم دارد، در یک درخواست.")
            .CacheOutput("reference");

        api.MapGet("/pois", async (
                    IDispatcher dispatcher,
                    string? cityId,
                    PoiCategory? category,
                    double? nearLat,
                    double? nearLng,
                    double? radiusKm,
                    CancellationToken cancellationToken) =>
                (await dispatcher.QueryAsync(
                    new GetPoisQuery
                    {
                        CityId = cityId,
                        Category = category,
                        NearLat = nearLat,
                        NearLng = nearLng,
                        RadiusKm = radiusKm,
                    },
                    cancellationToken)).ToHttpResult())
            .WithName("GetPois")
            .WithSummary("فهرست جاذبه‌ها")
            .WithDescription("با فیلتر اختیاری شهر، دسته یا شعاع از یک نقطه.")
            .CacheOutput("reference");

        api.MapPost("/trips/plan", async (
                    GeneratePlanQuery request,
                    IDispatcher dispatcher,
                    CancellationToken cancellationToken) =>
                (await dispatcher.QueryAsync(request, cancellationToken)).ToHttpResult())
            .WithName("GeneratePlan")
            .WithSummary("ساخت برنامهٔ سفر")
            .WithDescription(
                "برنامهٔ ساعت‌به‌ساعت و تفکیک هزینه. با وجود اینکه چیزی را تغییر نمی‌دهد "
                + "POST است، چون ورودی‌اش برای یک رشتهٔ پرس‌وجو بزرگ است.")
            .RequireRateLimiting(RateLimitPolicies.Plan);

        api.MapPost("/trips/optimize", async (
                    GeneratePlanQuery request,
                    IDispatcher dispatcher,
                    CancellationToken cancellationToken) =>
                (await dispatcher.QueryAsync(
                    new OptimizeBudgetQuery { Trip = request },
                    cancellationToken)).ToHttpResult())
            .WithName("OptimizeBudget")
            .WithSummary("راه‌های کاهش هزینه")
            .WithDescription(
                "هر راه با عدد صرفه‌جویی واقعی — برنامه با آن تغییر دوباره ساخته می‌شود، "
                + "پس عدد تخمین نیست.")
            // گران‌ترین اندپوینت است: چند بار اجرای کامل موتور.
            .RequireRateLimiting(RateLimitPolicies.Plan);

        api.MapPost("/trips/route-path", async (
                    RoutePathRequest request,
                    IRouteGeometryProvider geometry,
                    CancellationToken cancellationToken) =>
                {
                    if (request.Points is null || request.Points.Count < 2 || request.Points.Count > 100)
                    {
                        return ResultExtensions.Problem(DomainError.Validation(
                            "route.points", "بین ۲ تا ۱۰۰ نقطه لازم است."));
                    }

                    var waypoints = new List<Coordinate>(request.Points.Count);

                    foreach (var point in request.Points)
                    {
                        var coordinate = Coordinate.Create(point.Lat, point.Lng);

                        if (coordinate.IsFailure)
                        {
                            return ResultExtensions.Problem(coordinate.Error);
                        }

                        waypoints.Add(coordinate.Value);
                    }

                    var path = await geometry.GetPathAsync(waypoints, cancellationToken);

                    return (IResult)TypedResults.Ok(new RoutePathResponse(
                        [.. path.Select(p => new MapPointDto(p.Latitude, p.Longitude))],
                        path.Count > 0 ? "Routed" : "Straight"));
                })
            .WithName("GetRoutePath")
            .WithSummary("هندسهٔ مسیر واقعی جاده برای نقشه")
            .WithDescription(
                "نقاط خط جاده از میان توقف‌ها، به ترتیب. اگر سرویس مسیریابی در دسترس "
                + "نباشد فهرست خالی با برچسب «Straight» برمی‌گردد — کلاینت خط مستقیم "
                + "می‌کشد و صادقانه همان را اعلام می‌کند.")
            .RequireRateLimiting(RateLimitPolicies.Plan);

        api.MapGet("/pois/discover", async (
                    IDispatcher dispatcher,
                    double lat,
                    double lng,
                    double? radiusKm,
                    CancellationToken cancellationToken) =>
                (await dispatcher.QueryAsync(
                    new DiscoverPlacesQuery { Lat = lat, Lng = lng, RadiusKm = radiusKm ?? 15 },
                    cancellationToken)).ToHttpResult())
            .WithName("DiscoverPlaces")
            .WithSummary("کشف مکان از OpenStreetMap")
            .WithDescription("دادهٔ خام، برای پرکردن حفرهٔ پوشش دیتاست.")
            .RequireRateLimiting(RateLimitPolicies.Plan);
    }
}

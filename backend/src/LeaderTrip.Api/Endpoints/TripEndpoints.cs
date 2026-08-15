using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Reference.DiscoverPlaces;
using LeaderTrip.Application.Reference.GetPois;
using LeaderTrip.Application.Reference.GetReferenceData;
using LeaderTrip.Application.Trips.GeneratePlan;
using LeaderTrip.Application.Trips.OptimizeBudget;
using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Api.Endpoints;

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

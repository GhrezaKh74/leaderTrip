using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Auth;
using LeaderTrip.Domain.Common;

namespace LeaderTrip.Api.Endpoints;

/// <summary>پاسخ فهرست سفرهای ذخیره‌شده.</summary>
public sealed record SavedTripResponse(Guid Id, string Title, string Payload, DateTimeOffset UpdatedAt);

/// <summary>بدنهٔ ذخیرهٔ سفر — شناسهٔ خالی یعنی سفر تازه.</summary>
public sealed record SaveTripRequest(Guid? Id, string Title, string Payload);

/// <summary>اندپوینت‌های احراز هویت و سفرهای حساب.</summary>
/// <remarks>
/// <para>
/// توکن فقط در سرآیند <c>Authorization: Bearer</c> پذیرفته می‌شود — نه کوکی
/// (تا CSRF اصلاً موضوع نشود) و نه رشتهٔ پرس‌وجو (تا در لاگ و تاریخچه نماند).
/// </para>
/// <para>
/// ورود و ثبت‌نام پشت محدودساز سخت‌گیرانهٔ <see cref="RateLimitPolicies.Plan"/>
/// هستند: حدس‌زدن گذرواژه باید گران باشد.
/// </para>
/// </remarks>
internal static class AuthEndpoints
{
    private const string UserKey = "leadertrip.user";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth").WithTags("Auth");

        auth.MapPost("/register", async (
                    RegisterCommand command,
                    IDispatcher dispatcher,
                    CancellationToken cancellationToken) =>
                (await dispatcher.SendAsync(command, cancellationToken)).ToHttpResult())
            .WithSummary("ساخت حساب و ورود در همان لحظه")
            .RequireRateLimiting(RateLimitPolicies.Plan);

        auth.MapPost("/login", async (
                    LoginCommand command,
                    IDispatcher dispatcher,
                    CancellationToken cancellationToken) =>
                (await dispatcher.SendAsync(command, cancellationToken)).ToHttpResult())
            .WithSummary("ورود با ایمیل و گذرواژه")
            .RequireRateLimiting(RateLimitPolicies.Plan);

        auth.MapGet("/me", (HttpContext context) => TypedResults.Ok(CurrentUser(context)))
            .WithSummary("کاربر واردشده")
            .AddEndpointFilter<BearerFilter>();

        auth.MapPost("/logout", async (
                    HttpContext context,
                    ISessionStore sessions,
                    CancellationToken cancellationToken) =>
                {
                    // توکن همین درخواست باطل می‌شود — «خروج» یعنی همین، نه پاک‌کردن
                    // حافظهٔ مرورگر و زنده‌ماندن توکن روی سرور.
                    string? token = BearerToken(context);

                    if (token is not null)
                    {
                        await sessions.DeleteAsync(SessionTokens.HashOf(token), cancellationToken);
                    }

                    return Results.NoContent();
                })
            .WithSummary("خروج و ابطال نشست")
            .AddEndpointFilter<BearerFilter>();

        var trips = app.MapGroup("/api/me/trips")
            .WithTags("SavedTrips")
            .AddEndpointFilter<BearerFilter>();

        trips.MapGet("/", async (
            HttpContext context,
            ISavedTripStore store,
            CancellationToken cancellationToken) =>
        {
            var items = await store.ListAsync(CurrentUser(context).Id, cancellationToken);

            return TypedResults.Ok(items
                .Select(trip => new SavedTripResponse(trip.Id, trip.Title, trip.Payload, trip.UpdatedAt))
                .ToList());
        }).WithSummary("سفرهای ذخیره‌شدهٔ حساب");

        trips.MapPost("/", async (
            SaveTripRequest request,
            HttpContext context,
            ISavedTripStore store,
            TimeProvider clock,
            CancellationToken cancellationToken) =>
        {
            var user = CurrentUser(context);

            if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 120)
            {
                return ResultExtensions.Problem(DomainError.Validation(
                    "trip.title", "عنوان سفر لازم است و بیشتر از ۱۲۰ نویسه نمی‌شود."));
            }

            // محتوا JSON ورودی سفر است؛ سقف سخاوتمندانه فقط جلوی سوءاستفاده را
            // می‌گیرد — ورودی واقعی چند صد بایت است.
            if (string.IsNullOrWhiteSpace(request.Payload) || request.Payload.Length > 64_000)
            {
                return ResultExtensions.Problem(DomainError.Validation(
                    "trip.payload", "محتوای سفر خالی یا بیش از حد بزرگ است."));
            }

            var existing = await store.ListAsync(user.Id, cancellationToken);

            if (request.Id is null && existing.Count >= 100)
            {
                return ResultExtensions.Problem(DomainError.Validation(
                    "trip.quota", "هر حساب تا ۱۰۰ سفر ذخیره می‌تواند داشته باشد."));
            }

            // به‌روزرسانی فقط روی سفرِ خودِ کاربر می‌نشیند؛ شناسهٔ متعلق به
            // دیگری مثل «تازه» رفتار نمی‌شود، «پیدا نشد» است.
            if (request.Id is { } id && await store.FindAsync(user.Id, id, cancellationToken) is null)
            {
                return ResultExtensions.Problem(DomainError.NotFound(
                    "trip.notFound", "چنین سفری روی این حساب نیست."));
            }

            var trip = new SavedTrip(
                request.Id ?? Guid.NewGuid(),
                user.Id,
                request.Title.Trim(),
                request.Payload,
                clock.GetUtcNow());

            await store.UpsertAsync(trip, cancellationToken);

            return (IResult)TypedResults.Ok(
                new SavedTripResponse(trip.Id, trip.Title, trip.Payload, trip.UpdatedAt));
        }).WithSummary("ذخیره یا به‌روزرسانی سفر");

        trips.MapDelete("/{id:guid}", async (
            Guid id,
            HttpContext context,
            ISavedTripStore store,
            CancellationToken cancellationToken) =>
        {
            bool deleted = await store.DeleteAsync(CurrentUser(context).Id, id, cancellationToken);

            return deleted
                ? Results.NoContent()
                : (IResult)ResultExtensions.Problem(DomainError.NotFound(
                    "trip.notFound", "چنین سفری روی این حساب نیست."));
        }).WithSummary("حذف سفر ذخیره‌شده");
    }

    private static string? BearerToken(HttpContext context)
    {
        string? header = context.Request.Headers.Authorization;

        return header is not null && header.StartsWith("Bearer ", StringComparison.Ordinal)
            ? header["Bearer ".Length..]
            : null;
    }

    private static AuthenticatedUser CurrentUser(HttpContext context) =>
        context.Items[UserKey] as AuthenticatedUser
        ?? throw new InvalidOperationException("اندپوینت محافظت‌شده بدون فیلتر Bearer ثبت شده است.");

    /// <summary>سنجش توکن پیش از رسیدن به مسئول — همتای <c>ApiKeyFilter</c> برای کاربر.</summary>
    private sealed class BearerFilter : IEndpointFilter
    {
        private readonly ISessionStore _sessions;
        private readonly IUserStore _users;

        public BearerFilter(ISessionStore sessions, IUserStore users)
        {
            _sessions = sessions;
            _users = users;
        }

        public async ValueTask<object?> InvokeAsync(
            EndpointFilterInvocationContext context,
            EndpointFilterDelegate next)
        {
            string? token = BearerToken(context.HttpContext);

            if (token is not null
                && await _sessions.FindAsync(
                    SessionTokens.HashOf(token),
                    context.HttpContext.RequestAborted) is { } session
                && await _users.FindByIdAsync(session.UserId, context.HttpContext.RequestAborted) is { } user)
            {
                context.HttpContext.Items[UserKey] =
                    new AuthenticatedUser(user.Id, user.Email, user.DisplayName);

                return await next(context);
            }

            return TypedResults.Problem(
                detail: "برای این کار باید وارد حساب شوید.",
                statusCode: StatusCodes.Status401Unauthorized,
                title: "احراز هویت نشد",
                extensions: new Dictionary<string, object?> { ["code"] = "auth.required" });
        }
    }
}

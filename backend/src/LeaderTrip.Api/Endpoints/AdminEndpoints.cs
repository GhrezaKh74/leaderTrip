using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Prices.UpdatePriceBook;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Api.Endpoints;

/// <summary>اندپوینت‌های مدیریتی — فقط با کلید.</summary>
/// <remarks>
/// <para>
/// اگر کلیدی پیکربندی نشده باشد، این گروه اصلاً ثبت نمی‌شود. یعنی نمونه‌ای که
/// کلید ندارد، اندپوینت محافظت‌نشده هم ندارد — به‌جای اینکه با یک کلید پیش‌فرض
/// وانمود کند محافظت شده است.
/// </para>
/// <para>
/// این احراز هویت کاربر نیست. تفاوتش را در <c>ApiOptions.AdminApiKey</c>
/// نوشته‌ایم: قفلی روی در پشتی، نه سامانهٔ هویت.
/// </para>
/// </remarks>
internal static class AdminEndpoints
{
    private const string ApiKeyHeader = "X-Admin-Key";

    public static void MapAdminEndpoints(this IEndpointRouteBuilder app, string apiKey)
    {
        var admin = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .AddEndpointFilter(new ApiKeyFilter(apiKey))
            .ExcludeFromDescription();

        admin.MapPost("/prices", async (
                UpdatePriceBookCommand command,
                IDispatcher dispatcher,
                CancellationToken cancellationToken) =>
            (await dispatcher.SendAsync(command, cancellationToken)).ToHttpResult());
    }

    /// <summary>بررسی کلید پیش از رسیدن به مسئول.</summary>
    private sealed class ApiKeyFilter : IEndpointFilter
    {
        private readonly string _expected;

        public ApiKeyFilter(string expected) => _expected = expected;

        public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            string? provided = context.HttpContext.Request.Headers[ApiKeyHeader];

            // مقایسهٔ ثابت‌زمان: مقایسهٔ معمولی رشته با اولین بایت متفاوت برمی‌گردد
            // و همین تفاوت زمان، کلید را حرف‌به‌حرف قابل حدس‌زدن می‌کند.
            bool matches = provided is not null
                && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                    System.Text.Encoding.UTF8.GetBytes(provided),
                    System.Text.Encoding.UTF8.GetBytes(_expected));

            return matches
                ? next(context)
                : ValueTask.FromResult<object?>(TypedResults.Problem(
                    detail: "کلید مدیریتی نامعتبر است.",
                    statusCode: StatusCodes.Status401Unauthorized,
                    title: "احراز هویت نشد"));
        }
    }
}

/// <summary>ثبت مشروط گروه مدیریتی.</summary>
internal static class AdminEndpointRegistration
{
    public static void MapAdminIfConfigured(this WebApplication app)
    {
        var options = app.Services.GetRequiredService<IOptions<ApiOptions>>().Value;

        if (string.IsNullOrWhiteSpace(options.AdminApiKey))
        {
            ApiLog.AdminDisabled(app.Logger);

            return;
        }

        app.MapAdminEndpoints(options.AdminApiKey);
    }
}

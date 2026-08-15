using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Api;

/// <summary>سیاست‌های محدودسازی نرخ درخواست.</summary>
/// <remarks>
/// <para>
/// دو سطح دارد چون دو جنس درخواست داریم. خواندن دادهٔ مرجع ارزان است و کش
/// می‌شود؛ ساخت برنامه گران است و ممکن است به سرویس مسیریابی بیرونی هم درخواست
/// بزند. یک سقف واحد یا برای اولی بی‌جهت سخت‌گیر می‌شد یا برای دومی بی‌اثر.
/// </para>
/// <para>
/// محافظت از سهمیهٔ سرویس بیرونی بخشی از همین است: یک کلاینت پرسروصدا می‌تواند
/// سهمیهٔ OSRM را برای همهٔ کاربران تمام کند.
/// </para>
/// </remarks>
internal static class RateLimitPolicies
{
    public const string Plan = "plan";

    public static void AddLeaderTripRateLimiting(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                Partition(context, "global", Limits(context).RequestsPerMinute));

            options.AddPolicy(Plan, context =>
                Partition(context, Plan, Limits(context).PlanRequestsPerMinute));

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.ContentType = "application/problem+json";

                await context.HttpContext.Response.WriteAsJsonAsync(
                    new
                    {
                        title = "درخواست بیش از حد",
                        status = StatusCodes.Status429TooManyRequests,
                        detail = "تعداد درخواست‌ها از حد مجاز گذشت. کمی بعد دوباره تلاش کنید.",
                        code = "rateLimit.exceeded",
                    },
                    cancellationToken).ConfigureAwait(false);
            };
        });

    private static ApiOptions Limits(HttpContext context) =>
        context.RequestServices.GetRequiredService<IOptions<ApiOptions>>().Value;

    private static RateLimitPartition<string> Partition(HttpContext context, string prefix, int perMinute)
    {
        // پشت پروکسی، همهٔ درخواست‌ها یک IP دارند. تنظیم `ForwardedHeaders` در
        // میزبانی، شرط درست کارکردن این تفکیک است.
        string key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            string.Create(CultureInfo.InvariantCulture, $"{prefix}:{key}"),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = perMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
    }
}

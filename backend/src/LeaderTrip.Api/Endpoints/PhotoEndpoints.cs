using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;
using Microsoft.Net.Http.Headers;

namespace LeaderTrip.Api.Endpoints;

/// <summary>پاسخ بارگذاری عکس — شناسه و نشانی نسبی برای نمایش.</summary>
public sealed record PhotoUploadResponse(string Id, string Url);

/// <summary>اندپوینت‌های عکس چک‌این.</summary>
/// <remarks>
/// مثل بقیهٔ اندپوینت‌ها فقط ترجمه‌اند؛ اعتبارسنجی محتوا (امضای باینری، سقف
/// حجم) در پیاده‌سازی <see cref="IPhotoStore"/> است تا از هر راهی که عکس برسد
/// همان قاعده اجرا شود.
/// </remarks>
internal static class PhotoEndpoints
{
    public static void MapPhotoEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api").WithTags("Photos");

        api.MapPost("/photos", async (
                    IFormFile? photo,
                    IPhotoStore store,
                    CancellationToken cancellationToken) =>
                {
                    if (photo is null || photo.Length == 0)
                    {
                        return ResultExtensions.Problem(DomainError.Validation(
                            "photo.missing", "فایلی با نام فیلد «photo» فرستاده نشده است."));
                    }

                    var content = photo.OpenReadStream();

                    await using (content.ConfigureAwait(false))
                    {
                        var result = await store.SaveAsync(content, photo.Length, cancellationToken)
                            .ConfigureAwait(false);

                        return result.Match<IResult>(
                            saved => TypedResults.Ok(new PhotoUploadResponse(saved.Id, $"/api/photos/{saved.Id}")),
                            ResultExtensions.Problem);
                    }
                })
            .WithName("UploadPhoto")
            .WithSummary("بارگذاری عکس چک‌این")
            .WithDescription(
                "multipart/form-data با فیلد «photo». نوع واقعی فایل از امضای باینری "
                + "تشخیص داده می‌شود و فقط JPEG/PNG/WebP پذیرفته است.")
            // این API کوکی‌محور نیست، پس CSRF موضوعیت ندارد؛ بدون این، مدل‌بایندینگ
            // فرم در Minimal API اجرای اندپوینت را متوقف می‌کند.
            .DisableAntiforgery()
            .RequireRateLimiting(RateLimitPolicies.Plan);

        api.MapGet("/photos/{id}", async (
                    string id,
                    IPhotoStore store,
                    HttpContext context,
                    CancellationToken cancellationToken) =>
                {
                    var photo = await store.OpenAsync(id, cancellationToken).ConfigureAwait(false);

                    if (photo is null)
                    {
                        return ResultExtensions.Problem(DomainError.NotFound(
                            "photo.notFound", "چنین عکسی وجود ندارد."));
                    }

                    // شناسه تصادفی و یک‌بارساخت است؛ محتوایش هرگز عوض نمی‌شود،
                    // پس کش بی‌قیدوشرط درست است و بازدید دوم هیچ درخواستی نمی‌زند.
                    context.Response.Headers[HeaderNames.CacheControl] = "public, max-age=31536000, immutable";

                    return Results.Stream(photo.Content, photo.ContentType);
                })
            .WithName("GetPhoto")
            .WithSummary("دریافت عکس ذخیره‌شده");
    }
}

using LeaderTrip.Domain.Common;
using Microsoft.AspNetCore.Http.HttpResults;

namespace LeaderTrip.Api;

/// <summary>ترجمهٔ <see cref="Result{T}"/> به پاسخ HTTP.</summary>
/// <remarks>
/// <para>
/// تنها جایی است که دامنه به HTTP ترجمه می‌شود. اگر این نگاشت در هر اندپوینت
/// تکرار می‌شد، دیر یا زود دو اندپوینت برای یک جنس خطا دو کد وضعیت متفاوت
/// برمی‌گرداندند — و مصرف‌کننده مجبور می‌شد برای هرکدام جدا کد بنویسد.
/// </para>
/// <para>
/// پیام خطا فارسی و برای انسان است. <c>ProblemDetails</c> علاوه بر آن، کد
/// ماشین‌خوان دامنه را هم در <c>extensions.code</c> می‌برد تا رابط کاربری بتواند
/// بدون تکیه بر متن، رفتار خاص نشان دهد.
/// </para>
/// </remarks>
internal static class ResultExtensions
{
    public static Results<Ok<TValue>, ProblemHttpResult> ToHttpResult<TValue>(this Result<TValue> result)
    {
        ArgumentNullException.ThrowIfNull(result);

        return result.IsSuccess
            ? TypedResults.Ok(result.Value)
            : Problem(result.Error);
    }

    public static ProblemHttpResult Problem(DomainError error)
    {
        ArgumentNullException.ThrowIfNull(error);

        var (status, title) = error.Kind switch
        {
            ErrorKind.NotFound => (StatusCodes.Status404NotFound, "پیدا نشد"),
            ErrorKind.Conflict => (StatusCodes.Status409Conflict, "امکان‌پذیر نیست"),
            ErrorKind.Forbidden => (StatusCodes.Status403Forbidden, "دسترسی ندارید"),
            _ => (StatusCodes.Status400BadRequest, "درخواست نامعتبر"),
        };

        return TypedResults.Problem(
            detail: error.Message,
            statusCode: status,
            title: title,
            extensions: new Dictionary<string, object?> { ["code"] = error.Code });
    }
}

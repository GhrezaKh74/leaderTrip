namespace LeaderTrip.Domain.Common;

/// <summary>نتیجهٔ یک عملیات: یا موفق است، یا یک <see cref="DomainError"/> مشخص دارد.</summary>
public class Result
{
    protected Result(bool isSuccess, DomainError error)
    {
        if (isSuccess && error != DomainError.None)
        {
            throw new InvalidOperationException("نتیجهٔ موفق نمی‌تواند خطا داشته باشد.");
        }

        if (!isSuccess && error == DomainError.None)
        {
            throw new InvalidOperationException("نتیجهٔ ناموفق باید خطا داشته باشد.");
        }

        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }

    public bool IsFailure => !IsSuccess;

    public DomainError Error { get; }

    public static Result Success() => new(true, DomainError.None);

    public static Result Failure(DomainError error) => new(false, error);

    public static Result<TValue> Success<TValue>(TValue value) => new(value, true, DomainError.None);

    public static Result<TValue> Failure<TValue>(DomainError error) => new(default, false, error);
}

/// <summary>نتیجه‌ای که در صورت موفقیت مقدار هم دارد.</summary>
public sealed class Result<TValue> : Result
{
    private readonly TValue? _value;

    internal Result(TValue? value, bool isSuccess, DomainError error)
        : base(isSuccess, error) => _value = value;

    /// <summary>مقدار نتیجه. دسترسی به آن در حالت شکست خطاست.</summary>
    public TValue Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("مقدار نتیجهٔ ناموفق قابل خواندن نیست.");

    public static implicit operator Result<TValue>(TValue value) => Success(value);

    /// <summary>اجرای یکی از دو مسیر بسته به موفقیت — بدون بررسی دستی پرچم.</summary>
    public TOut Match<TOut>(Func<TValue, TOut> onSuccess, Func<DomainError, TOut> onFailure) =>
        IsSuccess ? onSuccess(Value) : onFailure(Error);
}

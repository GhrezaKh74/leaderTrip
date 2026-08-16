namespace LeaderTrip.Domain.Specifications;

/// <summary>نتیجهٔ سنجش یک قید: آیا برقرار است، و اگر نه چرا.</summary>
/// <remarks>
/// «چرا» بخش اصلی است، نه تزئین: کاربر باید بفهمد چرا جاذبه‌ای پیشنهاد نشده،
/// وگرنه فکر می‌کند اپ آن را بلد نیست.
/// </remarks>
public readonly record struct SpecificationResult(bool IsSatisfied, string? Reason)
{
    public static SpecificationResult Satisfied { get; } = new(true, null);

    public static SpecificationResult NotSatisfied(string reason) => new(false, reason);
}

/// <summary>
/// یک قید قابل ترکیب روی <typeparamref name="T"/>.
/// </summary>
/// <remarks>
/// چرا الگوی Specification و نه یک زنجیرهٔ <c>if</c>: هر قید یک کلاس مستقل و
/// جداگانه تست‌شدنی است، و افزودن قید تازه هیچ کد موجودی را دست نمی‌زند —
/// همان اصل باز/بسته. زنجیرهٔ if که در نسخهٔ قبلی بود، با هر قید جدید باید
/// ویرایش می‌شد.
/// </remarks>
public abstract class Specification<T>
{
    public abstract SpecificationResult Evaluate(T candidate);

    public bool IsSatisfiedBy(T candidate) => Evaluate(candidate).IsSatisfied;

    public Specification<T> And(Specification<T> other) => new AndSpecification<T>(this, other);
}

/// <summary>سازنده‌های کمکی قیدها.</summary>
public static class Spec
{
    /// <summary>ترکیب چند قید در یکی — به‌ترتیب سنجیده می‌شوند.</summary>
    public static Specification<T> All<T>(params Specification<T>[] specifications) =>
        specifications.Length == 0
            ? new AlwaysSatisfiedSpecification<T>()
            : specifications.Aggregate((left, right) => left.And(right));

    /// <summary>برقراری دست‌کم یکی کافی است؛ دلیلِ آخرین قید برگردانده می‌شود.</summary>
    public static Specification<T> Any<T>(params Specification<T>[] specifications) =>
        specifications.Length == 0
            ? new AlwaysSatisfiedSpecification<T>()
            : new AnySpecification<T>(specifications);
}

/// <summary>یکی از قیدها کافی است — «یا» منطقی.</summary>
internal sealed class AnySpecification<T> : Specification<T>
{
    private readonly Specification<T>[] _options;

    internal AnySpecification(Specification<T>[] options) => _options = options;

    public override SpecificationResult Evaluate(T candidate)
    {
        SpecificationResult last = SpecificationResult.NotSatisfied("هیچ قیدی برقرار نیست");

        foreach (var option in _options)
        {
            last = option.Evaluate(candidate);

            if (last.IsSatisfied)
            {
                return last;
            }
        }

        return last;
    }
}

/// <summary>هر دو قید باید برقرار باشند؛ دلیلِ اولین قیدِ نقض‌شده برگردانده می‌شود.</summary>
internal sealed class AndSpecification<T> : Specification<T>
{
    private readonly Specification<T> _left;
    private readonly Specification<T> _right;

    internal AndSpecification(Specification<T> left, Specification<T> right)
    {
        _left = left;
        _right = right;
    }

    public override SpecificationResult Evaluate(T candidate)
    {
        var leftResult = _left.Evaluate(candidate);
        return leftResult.IsSatisfied ? _right.Evaluate(candidate) : leftResult;
    }
}

internal sealed class AlwaysSatisfiedSpecification<T> : Specification<T>
{
    public override SpecificationResult Evaluate(T candidate) => SpecificationResult.Satisfied;
}

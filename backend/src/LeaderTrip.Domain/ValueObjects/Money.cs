using LeaderTrip.Domain.Common;

namespace LeaderTrip.Domain.ValueObjects;

/// <summary>مبلغ به تومان.</summary>
/// <remarks>
/// عمداً <c>decimal</c> است نه <c>double</c>: پول با اعشار دودویی جمع‌زدن،
/// خطای گردکردن انباشته می‌سازد و در گزارشی که ادعا می‌کند «هر ریال قابل ردیابی
/// است» پذیرفتنی نیست.
/// </remarks>
public readonly record struct Money : IComparable<Money>
{
    private Money(decimal amount) => Amount = amount;

    public static Money Zero => new(0m);

    public decimal Amount { get; }

    public static Result<Money> Create(decimal amount) =>
        amount < 0
            ? Result.Failure<Money>(DomainError.Validation("money.negative", "مبلغ نمی‌تواند منفی باشد."))
            : new Money(amount);

    /// <summary>ساخت بدون اعتبارسنجی، برای محاسبات داخلی که منفی‌شدن ممکن نیست.</summary>
    public static Money FromToman(decimal amount) => new(amount < 0 ? 0m : amount);

    public static Money operator +(Money left, Money right) => new(left.Amount + right.Amount);

    public static Money operator -(Money left, Money right) => new(left.Amount - right.Amount);

    public static Money operator *(Money money, decimal factor) => new(money.Amount * factor);

    public static bool operator <(Money left, Money right) => left.Amount < right.Amount;

    public static bool operator >(Money left, Money right) => left.Amount > right.Amount;

    public static bool operator <=(Money left, Money right) => left.Amount <= right.Amount;

    public static bool operator >=(Money left, Money right) => left.Amount >= right.Amount;

    public static Money Add(Money left, Money right) => left + right;

    public static Money Subtract(Money left, Money right) => left - right;

    public static Money Multiply(Money money, decimal factor) => money * factor;

    public int CompareTo(Money other) => Amount.CompareTo(other.Amount);

    public override string ToString() => $"{Amount:N0} تومان";
}

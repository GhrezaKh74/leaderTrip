namespace LeaderTrip.Domain.ValueObjects;

/// <summary>مسافت. واحدش در تایپ است، نه در نام متغیر.</summary>
/// <remarks>
/// دلیل وجودش: <c>double km</c> و <c>double minutes</c> از نظر کامپایلر یکی‌اند و
/// جابه‌جا دادنشان خطایی تولید نمی‌کند. این تایپ همان اشتباه را غیرممکن می‌کند.
/// </remarks>
public readonly record struct Distance : IComparable<Distance>
{
    private Distance(double kilometers) => Kilometers = kilometers;

    public static Distance Zero => new(0);

    public double Kilometers { get; }

    public static Distance FromKilometers(double kilometers) =>
        new(kilometers < 0 ? 0 : kilometers);

    public static Distance operator +(Distance left, Distance right) =>
        new(left.Kilometers + right.Kilometers);

    public static Distance operator *(Distance distance, double factor) =>
        new(distance.Kilometers * factor);

    public static bool operator <(Distance left, Distance right) => left.Kilometers < right.Kilometers;

    public static bool operator >(Distance left, Distance right) => left.Kilometers > right.Kilometers;

    public static bool operator <=(Distance left, Distance right) => left.Kilometers <= right.Kilometers;

    public static bool operator >=(Distance left, Distance right) => left.Kilometers >= right.Kilometers;

    public static Distance Add(Distance left, Distance right) => left + right;

    public static Distance Multiply(Distance distance, double factor) => distance * factor;

    public int CompareTo(Distance other) => Kilometers.CompareTo(other.Kilometers);

    public override string ToString() => $"{Kilometers:0.#} km";
}

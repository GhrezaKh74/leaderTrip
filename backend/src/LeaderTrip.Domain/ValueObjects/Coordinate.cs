using LeaderTrip.Domain.Common;

namespace LeaderTrip.Domain.ValueObjects;

/// <summary>یک نقطه روی زمین.</summary>
/// <remarks>
/// شیء مقدار است، نه موجودیت: دو مختصات با عرض و طول یکسان، یک چیزند و
/// شناسه‌ای ندارند. <c>readonly record struct</c> این را رایگان می‌دهد —
/// تساوی مقداری، تغییرناپذیری، و بدون تخصیص روی هیپ.
/// </remarks>
public readonly record struct Coordinate
{
    private const double EarthRadiusKm = 6371d;

    private Coordinate(double latitude, double longitude)
    {
        Latitude = latitude;
        Longitude = longitude;
    }

    public double Latitude { get; }

    public double Longitude { get; }

    /// <summary>ساخت با اعتبارسنجی — مختصات نامعتبر اصلاً به وجود نمی‌آید.</summary>
    public static Result<Coordinate> Create(double latitude, double longitude)
    {
        if (latitude is < -90 or > 90)
        {
            return Result.Failure<Coordinate>(
                DomainError.Validation("coordinate.latitude", "عرض جغرافیایی باید بین ‎−۹۰ و ۹۰ باشد."));
        }

        if (longitude is < -180 or > 180)
        {
            return Result.Failure<Coordinate>(
                DomainError.Validation("coordinate.longitude", "طول جغرافیایی باید بین ‎−۱۸۰ و ۱۸۰ باشد."));
        }

        return new Coordinate(latitude, longitude);
    }

    /// <summary>فاصلهٔ هوایی تا نقطهٔ دیگر (هاورساین).</summary>
    public Distance StraightLineTo(Coordinate other)
    {
        double dLat = ToRadians(other.Latitude - Latitude);
        double dLon = ToRadians(other.Longitude - Longitude);
        double lat1 = ToRadians(Latitude);
        double lat2 = ToRadians(other.Latitude);

        double h = (Math.Sin(dLat / 2) * Math.Sin(dLat / 2))
                   + (Math.Cos(lat1) * Math.Cos(lat2) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2));

        return Distance.FromKilometers(2 * EarthRadiusKm * Math.Asin(Math.Min(1d, Math.Sqrt(h))));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180d;
}

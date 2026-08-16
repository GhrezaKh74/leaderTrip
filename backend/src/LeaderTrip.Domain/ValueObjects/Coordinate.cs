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

    /// <summary>فاصلهٔ هوایی تا پاره‌خطِ میان دو نقطه.</summary>
    /// <remarks>
    /// برای «آیا این جاذبه نزدیک راهروی مبدأ تا مقصد است؟» به کار می‌رود.
    /// تصویر مستطیلی (equirectangular) حول نقطهٔ خودِ جاذبه استفاده شده که در
    /// مقیاس ایران خطایش از چند صدم درصد کمتر است — و این یک فیلترِ شعاع است،
    /// نه محاسبهٔ صورتحساب.
    /// </remarks>
    public Distance StraightLineToSegment(Coordinate a, Coordinate b)
    {
        double latRad = ToRadians(Latitude);
        double latitude = Latitude;
        double longitude = Longitude;

        // تصویر تخت: x شرقی، y شمالی، برحسب کیلومتر نسبت به همین نقطه
        (double X, double Y) Project(Coordinate p) => (
            ToRadians(p.Longitude - longitude) * Math.Cos(latRad) * EarthRadiusKm,
            ToRadians(p.Latitude - latitude) * EarthRadiusKm);

        var (ax, ay) = Project(a);
        var (bx, by) = Project(b);

        double dx = bx - ax;
        double dy = by - ay;
        double lengthSquared = (dx * dx) + (dy * dy);

        // پاره‌خطِ صفرطول همان فاصله تا نقطه است
        double t = lengthSquared < 1e-9
            ? 0d
            : Math.Clamp(((0 - ax) * dx + (0 - ay) * dy) / lengthSquared, 0d, 1d);

        double closestX = ax + (t * dx);
        double closestY = ay + (t * dy);

        return Distance.FromKilometers(Math.Sqrt((closestX * closestX) + (closestY * closestY)));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180d;
}

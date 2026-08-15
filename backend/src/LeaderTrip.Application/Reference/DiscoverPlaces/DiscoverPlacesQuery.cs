using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Application.Reference.DiscoverPlaces;

/// <summary>جست‌وجوی مکان‌های خام OpenStreetMap اطراف یک نقطه.</summary>
public sealed record DiscoverPlacesQuery : IQuery<DiscoveredPlacesResponse>
{
    public required double Lat { get; init; }

    public required double Lng { get; init; }

    public double RadiusKm { get; init; } = 15;
}

/// <param name="OsmId">شناسهٔ OSM.</param>
/// <param name="Name">نام، همان‌طور که در OSM ثبت شده.</param>
/// <param name="Lat">عرض جغرافیایی.</param>
/// <param name="Lng">طول جغرافیایی.</param>
/// <param name="Category">حدس ما از دسته — «حدس» بودنش در رابط کاربری هم گفته می‌شود.</param>
/// <param name="RawTag">تگ خام OSM.</param>
public sealed record DiscoveredPlaceDto(
    string OsmId,
    string Name,
    double Lat,
    double Lng,
    PoiCategory Category,
    string RawTag);

/// <param name="Items">مکان‌های پیدا‌شده.</param>
/// <param name="Note">هشدار همیشگی دربارهٔ جنس این داده.</param>
public sealed record DiscoveredPlacesResponse(IReadOnlyList<DiscoveredPlaceDto> Items, string Note);

internal sealed class DiscoverPlacesHandler : IQueryHandler<DiscoverPlacesQuery, DiscoveredPlacesResponse>
{
    private const string Note =
        "این‌ها دادهٔ خام OpenStreetMap‌اند: مدت بازدید، بلیت، سختی مسیر و تناسب سنی ندارند. "
        + "اگر یکی را به سفر اضافه می‌کنید، خودتان مدت و هزینه‌اش را تعیین کنید.";

    private readonly IPlaceDiscovery _discovery;

    public DiscoverPlacesHandler(IPlaceDiscovery discovery) => _discovery = discovery;

    public async Task<Result<DiscoveredPlacesResponse>> HandleAsync(
        DiscoverPlacesQuery query,
        CancellationToken cancellationToken)
    {
        var centre = Coordinate.Create(query.Lat, query.Lng);

        if (centre.IsFailure)
        {
            return Result.Failure<DiscoveredPlacesResponse>(centre.Error);
        }

        var places = await _discovery
            .SearchAsync(centre.Value, query.RadiusKm, cancellationToken)
            .ConfigureAwait(false);

        return new DiscoveredPlacesResponse(
            [.. places.Select(p => new DiscoveredPlaceDto(
                p.OsmId,
                p.Name,
                p.Location.Latitude,
                p.Location.Longitude,
                p.Category,
                p.RawTag))],
            Note);
    }
}

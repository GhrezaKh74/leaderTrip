using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Application.Reference.GetPois;

/// <summary>فهرست جاذبه‌ها، با فیلتر اختیاری.</summary>
/// <remarks>
/// جدا از <c>GetReferenceDataQuery</c> است چون اندازه‌اش فرق دارد: شهرها و
/// خودروها چند کیلوبایت‌اند و همیشه لازم، ولی فهرست کامل جاذبه‌ها بزرگ است و فقط
/// وقتی لازم می‌شود که کاربر نقشه یا فهرست را باز کند.
/// </remarks>
public sealed record GetPoisQuery : IQuery<PoiListResponse>
{
    public string? CityId { get; init; }

    public PoiCategory? Category { get; init; }

    /// <summary>اگر داده شود، فقط جاذبه‌های داخل این شعاع از این نقطه.</summary>
    public double? NearLat { get; init; }

    public double? NearLng { get; init; }

    public double? RadiusKm { get; init; }
}

public sealed record PoiListResponse(int Total, IReadOnlyList<PoiDto> Items);

public sealed record PoiDto(
    string Id,
    string Name,
    string CityId,
    double Lat,
    double Lng,
    PoiCategory Category,
    double Rating,
    int VisitMinutes,
    decimal Ticket,
    IReadOnlyList<int> BestMonths,
    bool Indoor,
    Difficulty Difficulty,
    int MinAge,
    bool KidFriendly,
    bool SeniorFriendly,
    OffroadCapability RequiredVehicle,
    bool NightSuitable,
    IReadOnlyList<string> Tags,
    string Description);

internal sealed class GetPoisHandler : IQueryHandler<GetPoisQuery, PoiListResponse>
{
    private readonly IPoiRepository _pois;

    public GetPoisHandler(IPoiRepository pois) => _pois = pois;

    public async Task<Result<PoiListResponse>> HandleAsync(
        GetPoisQuery query,
        CancellationToken cancellationToken)
    {
        var all = await _pois.GetAllAsync(cancellationToken).ConfigureAwait(false);
        IEnumerable<PointOfInterest> filtered = all;

        if (query.CityId is { Length: > 0 } cityId)
        {
            filtered = filtered.Where(p => string.Equals(p.CityId, cityId, StringComparison.Ordinal));
        }

        if (query.Category is { } category)
        {
            filtered = filtered.Where(p => p.Category == category);
        }

        if (query is { NearLat: { } lat, NearLng: { } lng, RadiusKm: { } radius })
        {
            var centre = Coordinate.Create(lat, lng);

            if (centre.IsFailure)
            {
                return Result.Failure<PoiListResponse>(centre.Error);
            }

            filtered = filtered.Where(p => p.Location.StraightLineTo(centre.Value).Kilometers <= radius);
        }

        var items = filtered
            .OrderByDescending(p => p.Rating)
            .Select(Map)
            .ToList();

        return new PoiListResponse(items.Count, items);
    }

    private static PoiDto Map(PointOfInterest poi) => new(
        poi.Id,
        poi.Name,
        poi.CityId,
        poi.Location.Latitude,
        poi.Location.Longitude,
        poi.Category,
        poi.Rating,
        (int)poi.VisitDuration.TotalMinutes,
        poi.Ticket.Amount,
        [.. poi.BestMonths.Order()],
        poi.IsIndoor,
        poi.Difficulty,
        poi.MinimumAge,
        poi.IsKidFriendly,
        poi.IsSeniorFriendly,
        poi.RequiredVehicle,
        poi.IsNightSuitable,
        poi.Tags,
        poi.Description);
}

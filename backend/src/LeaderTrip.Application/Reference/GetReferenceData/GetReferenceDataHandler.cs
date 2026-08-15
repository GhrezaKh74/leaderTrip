using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;

namespace LeaderTrip.Application.Reference.GetReferenceData;

internal sealed class GetReferenceDataHandler
    : IQueryHandler<GetReferenceDataQuery, ReferenceDataResponse>
{
    private readonly ICityRepository _cities;
    private readonly IVehicleRepository _vehicles;
    private readonly IPriceBookProvider _prices;

    public GetReferenceDataHandler(
        ICityRepository cities,
        IVehicleRepository vehicles,
        IPriceBookProvider prices)
    {
        _cities = cities;
        _vehicles = vehicles;
        _prices = prices;
    }

    public async Task<Result<ReferenceDataResponse>> HandleAsync(
        GetReferenceDataQuery query,
        CancellationToken cancellationToken)
    {
        var cities = await _cities.GetAllAsync(cancellationToken).ConfigureAwait(false);
        var vehicles = await _vehicles.GetAllAsync(cancellationToken).ConfigureAwait(false);
        var prices = await _prices.GetCurrentAsync(cancellationToken).ConfigureAwait(false);

        return new ReferenceDataResponse(
            [.. cities.OrderBy(c => c.Name, StringComparer.Ordinal).Select(Map)],
            [.. vehicles.Select(Map)],
            Map(prices));
    }

    private static CityDto Map(City city) => new(
        city.Id,
        city.Name,
        city.Province,
        city.Location.Latitude,
        city.Location.Longitude,
        city.CostIndex,
        city.Amenities,
        city.Climate,
        city.CanStayOvernight);

    private static VehicleDto Map(Vehicle vehicle) => new(
        vehicle.Id,
        vehicle.Label,
        vehicle.Class,
        vehicle.Fuel,
        vehicle.ConsumptionPer100Km,
        vehicle.Seats,
        vehicle.Offroad,
        vehicle.DepreciationPerKm);

    private static PriceBookDto Map(PriceBook prices) => new(
        Flatten(prices.SubsidizedFuel),
        Flatten(prices.FreeMarketFuel),
        prices.TollPerKilometer.Amount,
        prices.FreewayShare,
        Flatten(prices.LodgingPerNight),
        prices.Meals.ToDictionary(
            kv => kv.Key.ToString(),
            kv => new MealPricesDto(
                kv.Value.Breakfast.Amount,
                kv.Value.Lunch.Amount,
                kv.Value.Dinner.Amount),
            StringComparer.Ordinal),
        prices.SnackRate,
        Flatten(prices.MiscRate),
        Flatten(prices.BufferRate),
        prices.UpdatedAt);

    /// <summary>
    /// کلید شمارشی به رشته تبدیل می‌شود چون JSON کلید غیررشته‌ای ندارد و
    /// عددِ خامِ enum در پاسخ، برای مصرف‌کننده معنایی ندارد.
    /// </summary>
    private static Dictionary<string, decimal> Flatten<TKey>(IReadOnlyDictionary<TKey, Domain.ValueObjects.Money> source)
        where TKey : notnull =>
        source.ToDictionary(kv => kv.Key.ToString()!, kv => kv.Value.Amount, StringComparer.Ordinal);

    private static Dictionary<string, decimal> Flatten<TKey>(IReadOnlyDictionary<TKey, decimal> source)
        where TKey : notnull =>
        source.ToDictionary(kv => kv.Key.ToString()!, kv => kv.Value, StringComparer.Ordinal);
}

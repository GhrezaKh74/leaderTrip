using FluentValidation;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;

namespace LeaderTrip.Application.Reference.SearchPlaces;

/// <summary>جست‌وجوی نام مکان — برای «افزودن توقف دلخواه» روی نقشه.</summary>
public sealed record SearchPlacesQuery : IQuery<SearchPlacesResponse>
{
    public required string Text { get; init; }
}

/// <param name="Name">نام نمایشی مکان.</param>
/// <param name="Lat">عرض جغرافیایی.</param>
/// <param name="Lng">طول جغرافیایی.</param>
public sealed record SearchedPlaceDto(string Name, double Lat, double Lng);

/// <param name="Items">نتیجه‌ها؛ خالی یعنی چیزی پیدا نشد یا سرویس در دسترس نبود.</param>
public sealed record SearchPlacesResponse(IReadOnlyList<SearchedPlaceDto> Items);

public sealed class SearchPlacesValidator : AbstractValidator<SearchPlacesQuery>
{
    public SearchPlacesValidator()
    {
        RuleFor(q => q.Text)
            .NotEmpty().WithMessage("عبارت جست‌وجو لازم است.")
            .MaximumLength(120).WithMessage("عبارت جست‌وجو بلندتر از حد است.");
    }
}

internal sealed class SearchPlacesHandler : IQueryHandler<SearchPlacesQuery, SearchPlacesResponse>
{
    private readonly IGeocoder _geocoder;

    public SearchPlacesHandler(IGeocoder geocoder) => _geocoder = geocoder;

    public async Task<Result<SearchPlacesResponse>> HandleAsync(
        SearchPlacesQuery query,
        CancellationToken cancellationToken)
    {
        var places = await _geocoder.SearchAsync(query.Text.Trim(), cancellationToken).ConfigureAwait(false);

        return new SearchPlacesResponse(
            [.. places.Select(p => new SearchedPlaceDto(p.Name, p.Location.Latitude, p.Location.Longitude))]);
    }
}

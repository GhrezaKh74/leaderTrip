using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Entities;

/// <summary>شهری که می‌شود از آن حرکت کرد یا شب را در آن ماند.</summary>
public sealed class City
{
    public City(
        string id,
        string name,
        string province,
        Coordinate location,
        decimal costIndex,
        int amenities,
        Climate climate)
    {
        Id = id;
        Name = name;
        Province = province;
        Location = location;
        CostIndex = costIndex;
        Amenities = amenities;
        Climate = climate;
    }

    public string Id { get; }

    public string Name { get; }

    public string Province { get; }

    public Coordinate Location { get; }

    /// <summary>ضریب گرانی نسبت به میانگین کشور؛ ۱٫۰ = میانگین.</summary>
    public decimal CostIndex { get; }

    /// <summary>۳ = هتل و رستوران فراوان · ۲ = محدود · ۱ = حداقلی.</summary>
    public int Amenities { get; }

    public Climate Climate { get; }

    /// <summary>آیا شب ماندن در این شهر منطقی است؟</summary>
    public bool CanStayOvernight => Amenities >= 2;
}

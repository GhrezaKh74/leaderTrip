using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Domain.Entities;

/// <summary>یکی از همسفران.</summary>
public sealed class Traveler
{
    public Traveler(string id, string name, int age, MobilityLevel mobility, bool isDriver)
    {
        Id = id;
        Name = name;
        Age = age;
        Mobility = mobility;
        IsDriver = isDriver;
    }

    public string Id { get; }

    public string Name { get; }

    public int Age { get; }

    public MobilityLevel Mobility { get; }

    public bool IsDriver { get; }

    /// <summary>
    /// توان پیاده‌روی این فرد، ۰ تا ۱.
    /// </summary>
    /// <remarks>
    /// این‌جا زندگی می‌کند نه در سرویس، چون خاصیت خودِ همسفر است نه تصمیم
    /// برنامه‌ریز — همان اصل «رفتار کنار داده».
    /// </remarks>
    public double Stamina
    {
        get
        {
            double byAge = Age switch
            {
                < 4 => 0.25,
                < 8 => 0.45,
                < 13 => 0.70,
                < 60 => 1.00,
                < 70 => 0.65,
                _ => 0.40,
            };

            double byMobility = Mobility switch
            {
                MobilityLevel.Wheelchair => 0.15,
                MobilityLevel.Limited => 0.40,
                _ => 1.00,
            };

            return Math.Min(byAge, byMobility);
        }
    }
}

using LeaderTrip.Domain.Enums;

namespace LeaderTrip.Domain.Entities;

/// <summary>خودرویی که سفر با آن انجام می‌شود.</summary>
public sealed class Vehicle
{
    public Vehicle(
        string id,
        string label,
        VehicleClass vehicleClass,
        FuelKind fuel,
        double consumptionPer100Km,
        int seats,
        OffroadCapability offroad,
        double speedFactor,
        decimal depreciationPerKm,
        decimal tollFactor)
    {
        Id = id;
        Label = label;
        Class = vehicleClass;
        Fuel = fuel;
        ConsumptionPer100Km = consumptionPer100Km;
        Seats = seats;
        Offroad = offroad;
        SpeedFactor = speedFactor;
        DepreciationPerKm = depreciationPerKm;
        TollFactor = tollFactor;
    }

    public string Id { get; }

    public string Label { get; }

    public VehicleClass Class { get; }

    public FuelKind Fuel { get; }

    /// <summary>لیتر بر ۱۰۰ کیلومتر — برای برقی، کیلووات‌ساعت بر ۱۰۰ کیلومتر.</summary>
    public double ConsumptionPer100Km { get; }

    public int Seats { get; }

    public OffroadCapability Offroad { get; }

    /// <summary>ضریب سرعت مؤثر نسبت به سواری.</summary>
    public double SpeedFactor { get; }

    /// <summary>تومان بر کیلومتر — روغن، لاستیک، لنت، سرویس.</summary>
    public decimal DepreciationPerKm { get; }

    /// <summary>ضریب عوارض نسبت به سواری.</summary>
    public decimal TollFactor { get; }

    public bool CanReach(OffroadCapability required) => Offroad >= required;
}

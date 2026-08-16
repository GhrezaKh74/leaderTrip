using System.Globalization;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Pricing.Components;

/// <summary>سوخت: مسافت × مصرف خودرو × قیمت مؤثر هر لیتر.</summary>
public sealed class FuelCost : ICostComponent
{
    public int Order => 1;

    /// <summary>ضریب افزایش مصرف به‌خاطر سرنشین اضافه؛ سقف ۱٫۲.</summary>
    public static double LoadFactor(double passengersPerVehicle) =>
        Math.Min(1.2, 1 + (0.03 * Math.Max(0, passengersPerVehicle - 2)));

    /// <summary>قیمت مؤثر با در نظر گرفتن سهم سهمیه‌ای.</summary>
    public static Money EffectivePrice(PriceBook prices, FuelKind fuel, decimal subsidizedShare)
    {
        decimal share = Math.Clamp(subsidizedShare, 0m, 1m);
        var subsidized = prices.SubsidizedFuel[fuel];
        var free = prices.FreeMarketFuel[fuel];
        return Money.FromToman((share * subsidized.Amount) + ((1 - share) * free.Amount));
    }

    public CostLine Calculate(CostContext context)
    {
        double passengersPerCar = (double)context.Group.Count / Math.Max(1, context.VehicleCount);
        double load = LoadFactor(passengersPerCar);
        double mountainPenalty = 1 + (0.15 * context.MountainShare);

        double units = context.TotalDistance.Kilometers / 100d
                       * context.Vehicle.ConsumptionPer100Km * load * mountainPenalty;

        var price = EffectivePrice(context.Prices, context.Vehicle.Fuel, context.SubsidizedFuelShare);
        var amount = Money.FromToman((decimal)units * price.Amount * context.VehicleCount);

        string unit = context.Vehicle.Fuel == FuelKind.Electric ? "کیلووات‌ساعت" : "لیتر";
        string formula = string.Create(
            CultureInfo.InvariantCulture,
            $"{context.TotalDistance.Kilometers:0} کیلومتر × {context.Vehicle.ConsumptionPer100Km:0.#} {unit}/۱۰۰کیلومتر × {price} = {units:0.#} {unit}")
            + (context.VehicleCount > 1 ? $" × {context.VehicleCount} خودرو" : string.Empty);

        return new CostLine("fuel", "سوخت", amount, formula);
    }
}

/// <summary>عوارض آزادراهی.</summary>
public sealed class TollCost : ICostComponent
{
    public int Order => 2;

    public CostLine Calculate(CostContext context)
    {
        var amount = Money.FromToman(
            (decimal)context.TotalDistance.Kilometers
            * context.Prices.FreewayShare
            * context.Prices.TollPerKilometer.Amount
            * context.Vehicle.TollFactor
            * context.VehicleCount);

        string formula = string.Create(
            CultureInfo.InvariantCulture,
            $"{context.TotalDistance.Kilometers:0} کیلومتر × {context.Prices.FreewayShare:P0} آزادراه × {context.Prices.TollPerKilometer} بر کیلومتر");

        return new CostLine("toll", "عوارض آزادراه", amount, formula);
    }
}

/// <summary>اقامت شبانه.</summary>
public sealed class LodgingCost : ICostComponent
{
    public int Order => 3;

    /// <summary>ضریب نوع اقامت نسبت به هتل.</summary>
    public static decimal KindFactor(LodgingKind kind) => kind switch
    {
        LodgingKind.Hotel => 1m,
        LodgingKind.EcoLodge => 0.75m,
        LodgingKind.Villa => 1.1m,
        LodgingKind.Camp => 0.1m,
        LodgingKind.Friends => 0m,
        _ => 1m,
    };

    /// <summary>ضریب فصل — نوروز و اوج تابستان گران‌ترند.</summary>
    public static decimal SeasonFactor(int month, Climate climate) => month switch
    {
        3 or 4 => 1.45m,
        7 or 8 when climate is Climate.Caspian or Climate.Mountain => 1.30m,
        12 or 1 or 2 when climate == Climate.Gulf => 1.25m,
        _ => 1m,
    };

    public CostLine Calculate(CostContext context)
    {
        decimal payingGuests = context.Group.Travelers.Sum(t => AgeFactors.Lodging(t.Age));
        var baseRate = context.Prices.LodgingPerNight[context.Style];
        decimal kindFactor = KindFactor(context.Lodging);

        var total = Money.Zero;
        foreach (var city in context.NightCities)
        {
            total += Money.FromToman(
                payingGuests * baseRate.Amount * city.CostIndex
                * SeasonFactor(context.Month, city.Climate) * kindFactor);
        }

        string formula = context.Nights == 0
            ? "بدون شب اقامت"
            : string.Create(
                CultureInfo.InvariantCulture,
                $"{context.Nights} شب × {payingGuests:0.#} نفر معادل × {baseRate} × ضریب گرانی شهرها");

        return new CostLine("lodging", "اقامت", total, formula);
    }
}

/// <summary>وعده‌های غذایی.</summary>
public sealed class MealsCost : ICostComponent
{
    public int Order => 4;

    public CostLine Calculate(CostContext context)
    {
        decimal eaters = context.Group.Travelers.Sum(t => AgeFactors.Meal(t.Age));
        var prices = context.Prices.Meals[context.Style];
        decimal cityIndex = AverageCityIndex(context);

        // صبحانه در محل اقامت (به تعداد شب‌ها)، ناهار هر روز، شام هر شب.
        // ناهارِ همراه از خانه می‌آید و در این تفکیک هزینه‌ای ندارد.
        decimal lunchTotal = context.PicnicLunch ? 0m : context.Days * prices.Lunch.Amount;

        var amount = Money.FromToman(
            ((context.Nights * prices.Breakfast.Amount)
             + lunchTotal
             + (context.Nights * prices.Dinner.Amount))
            * eaters * cityIndex);

        string lunchText = context.PicnicLunch ? "ناهار همراه (بی‌هزینه)" : $"{context.Days} ناهار";
        string formula = string.Create(
            CultureInfo.InvariantCulture,
            $"{context.Nights} صبحانه + {lunchText} + {context.Nights} شام × {eaters:0.#} نفر معادل (کودکان سهم کمتری دارند)");

        return new CostLine("meals", "وعده‌های غذایی", amount, formula);
    }

    internal static decimal AverageCityIndex(CostContext context) =>
        context.NightCities.Count == 0 ? 1m : context.NightCities.Average(c => c.CostIndex);
}

/// <summary>تنقلات بین‌راهی — درصدی از خوراک.</summary>
public sealed class SnacksCost : ICostComponent
{
    public int Order => 5;

    public CostLine Calculate(CostContext context)
    {
        var meals = new MealsCost().Calculate(context).Amount;
        var amount = meals * context.Prices.SnackRate;

        string formula = string.Create(
            CultureInfo.InvariantCulture,
            $"{context.Prices.SnackRate:P0} روی جمع وعده‌های غذایی — نوشیدنی، آجیل و خرده‌خوراکی جاده");

        return new CostLine("snacks", "تنقلات بین‌راهی", amount, formula);
    }
}

/// <summary>بلیت ورودی جاذبه‌ها.</summary>
public sealed class TicketsCost : ICostComponent
{
    public int Order => 6;

    public CostLine Calculate(CostContext context)
    {
        decimal weight = context.Group.Travelers.Sum(t => AgeFactors.Ticket(t.Age));
        var paid = context.VisitedPois.Where(p => !p.IsFree).ToList();

        var amount = Money.FromToman(paid.Sum(p => p.Ticket.Amount * weight));

        string formula = paid.Count == 0
            ? "همهٔ جاذبه‌های برنامه رایگان‌اند"
            : string.Create(
                CultureInfo.InvariantCulture,
                $"{paid.Count} جاذبهٔ بلیت‌دار × {weight:0.#} نفر معادل ({context.VisitedPois.Count - paid.Count} جاذبهٔ رایگان)");

        return new CostLine("tickets", "بلیت جاذبه‌ها", amount, formula);
    }
}

/// <summary>اهلاک خودرو — قلمی که تقریباً همه فراموشش می‌کنند.</summary>
/// <remarks>
/// در سفر نمونهٔ نسخهٔ اول، اهلاک بزرگ‌تر از سوخت درآمد. سوخت در ایران ارزان
/// است؛ لاستیک و روغن نیستند.
/// </remarks>
public sealed class DepreciationCost : ICostComponent
{
    public int Order => 7;

    public CostLine Calculate(CostContext context)
    {
        var amount = Money.FromToman(
            (decimal)context.TotalDistance.Kilometers
            * context.Vehicle.DepreciationPerKm
            * context.VehicleCount);

        string formula = string.Create(
            CultureInfo.InvariantCulture,
            $"{context.TotalDistance.Kilometers:0} کیلومتر × {context.Vehicle.DepreciationPerKm:N0} تومان بر کیلومتر — روغن، لاستیک، لنت و سرویس");

        return new CostLine("depreciation", "اهلاک خودرو", amount, formula);
    }
}

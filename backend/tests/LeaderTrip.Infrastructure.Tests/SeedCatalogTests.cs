using LeaderTrip.Domain.Enums;
using LeaderTrip.Infrastructure.Seed;

namespace LeaderTrip.Infrastructure.Tests;

/// <summary>دادهٔ مرجع منتقل‌شده از نسخهٔ اول.</summary>
/// <remarks>
/// این‌ها تست «کد» نیستند، تست «داده»اند — و همان‌قدر لازم. انتقال ۱۴۳ جاذبه با
/// اسکریپت انجام شد تا دستی نباشد، ولی اسکریپت هم می‌تواند اشتباه کند؛ چیزی که
/// جلوی خطای بی‌صدا را می‌گیرد این ادعاهاست.
/// </remarks>
public sealed class SeedCatalogTests
{
    private static readonly SeedCatalog Catalog = SeedCatalog.Instance;

    [Fact]
    public void Catalog_Contains_TheFullDataset()
    {
        Assert.Equal(85, Catalog.Cities.Count);
        Assert.Equal(143, Catalog.PointsOfInterest.Count);
        Assert.Equal(15, Catalog.Vehicles.Count);
    }

    [Fact]
    public void EveryPoi_BelongsTo_AKnownCity()
    {
        var cityIds = Catalog.Cities.Select(c => c.Id).ToHashSet(StringComparer.Ordinal);

        var orphans = Catalog.PointsOfInterest
            .Where(p => !cityIds.Contains(p.CityId))
            .Select(p => $"{p.Id}→{p.CityId}")
            .ToList();

        Assert.Empty(orphans);
    }

    [Fact]
    public void Identifiers_AreUnique()
    {
        Assert.Equal(Catalog.Cities.Count, Catalog.Cities.Select(c => c.Id).Distinct(StringComparer.Ordinal).Count());
        Assert.Equal(
            Catalog.PointsOfInterest.Count,
            Catalog.PointsOfInterest.Select(p => p.Id).Distinct(StringComparer.Ordinal).Count());
        Assert.Equal(
            Catalog.Vehicles.Count,
            Catalog.Vehicles.Select(v => v.Id).Distinct(StringComparer.Ordinal).Count());
    }

    /// <summary>
    /// جعبهٔ محیطی تقریبی ایران. جابه‌جا نوشتن عرض و طول — که رایج‌ترین اشتباه در
    /// دادهٔ جغرافیایی است — نقطه را وسط عربستان می‌اندازد و این‌جا گیر می‌افتد.
    /// </summary>
    [Fact]
    public void EveryCoordinate_FallsInsideIran()
    {
        var outside = Catalog.Cities
            .Select(c => (c.Id, c.Location))
            .Concat(Catalog.PointsOfInterest.Select(p => (p.Id, p.Location)))
            .Where(x => x.Location.Latitude is < 24 or > 40 || x.Location.Longitude is < 43 or > 64)
            .Select(x => x.Id)
            .ToList();

        Assert.Empty(outside);
    }

    [Fact]
    public void EveryPoi_HasSaneVisitDurationAndRating()
    {
        foreach (var poi in Catalog.PointsOfInterest)
        {
            Assert.InRange(poi.Rating, 1d, 5d);
            Assert.InRange(poi.VisitDuration.TotalMinutes, 15d, 12 * 60d);
            Assert.NotEmpty(poi.BestMonths);
            Assert.All(poi.BestMonths, month => Assert.InRange(month, 1, 12));
        }
    }

    [Fact]
    public void EveryVehicle_HasPositiveConsumptionAndSeats()
    {
        foreach (var vehicle in Catalog.Vehicles)
        {
            Assert.True(vehicle.ConsumptionPer100Km > 0, vehicle.Id);
            Assert.True(vehicle.Seats > 0, vehicle.Id);
            Assert.True(vehicle.DepreciationPerKm >= 0, vehicle.Id);
        }
    }

    /// <summary>هر سطح سفر باید قیمت داشته باشد، وگرنه موتور هزینه وسط کار می‌ترکد.</summary>
    [Fact]
    public void PriceBook_Covers_EveryStyleAndFuel()
    {
        var prices = Catalog.PriceBook;

        foreach (var style in Enum.GetValues<TravelStyle>())
        {
            Assert.True(prices.LodgingPerNight.ContainsKey(style), $"اقامت {style}");
            Assert.True(prices.Meals.ContainsKey(style), $"خوراک {style}");
            Assert.True(prices.MiscRate.ContainsKey(style), $"متفرقه {style}");
            Assert.True(prices.BufferRate.ContainsKey(style), $"بافر {style}");
        }

        foreach (var fuel in Enum.GetValues<FuelKind>())
        {
            Assert.True(prices.SubsidizedFuel.ContainsKey(fuel), $"سوخت سهمیه‌ای {fuel}");
            Assert.True(prices.FreeMarketFuel.ContainsKey(fuel), $"سوخت آزاد {fuel}");
        }
    }

    /// <summary>
    /// متنِ خامی که در پایگاه داده ذخیره می‌شود باید همان دفترچه‌ای را بسازد که
    /// حالت بدون پایگاه داده استفاده می‌کند. اگر این دو از هم دور شوند، عوض‌کردن
    /// حالت اجرا بی‌صدا قیمت‌ها را تغییر می‌دهد.
    /// </summary>
    [Fact]
    public void PriceBook_RoundTrips_ThroughStoredJson()
    {
        var reparsed = SeedCatalog.ParsePriceBook(Catalog.RawPriceBookJson);

        // `record` تساوی ساختاری دارد ولی دیکشنری‌هایش را با ارجاع مقایسه می‌کند،
        // پس مقایسهٔ مستقیم دو نمونه چیزی را ثابت نمی‌کند. محتوا سنجیده می‌شود.
        Assert.Equal(Catalog.PriceBook.UpdatedAt, reparsed.UpdatedAt, StringComparer.Ordinal);
        Assert.Equal(Catalog.PriceBook.TollPerKilometer, reparsed.TollPerKilometer);
        Assert.Equal(Catalog.PriceBook.FreewayShare, reparsed.FreewayShare);
        Assert.Equal(Catalog.PriceBook.SnackRate, reparsed.SnackRate);

        foreach (var style in Enum.GetValues<TravelStyle>())
        {
            Assert.Equal(Catalog.PriceBook.LodgingPerNight[style], reparsed.LodgingPerNight[style]);
            Assert.Equal(Catalog.PriceBook.Meals[style], reparsed.Meals[style]);
        }

        foreach (var fuel in Enum.GetValues<FuelKind>())
        {
            Assert.Equal(Catalog.PriceBook.SubsidizedFuel[fuel], reparsed.SubsidizedFuel[fuel]);
            Assert.Equal(Catalog.PriceBook.FreeMarketFuel[fuel], reparsed.FreeMarketFuel[fuel]);
        }
    }
}

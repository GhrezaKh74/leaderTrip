using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Infrastructure.Persistence;

namespace LeaderTrip.Infrastructure.Seed;

/// <summary>دادهٔ مرجع همراه برنامه: شهرها، جاذبه‌ها، خودروها و قیمت‌های پایه.</summary>
/// <remarks>
/// <para>
/// فایل‌های JSON با <c>npm run seed:export</c> از دادهٔ نسخهٔ TypeScript ساخته
/// می‌شوند و به‌صورت منبع تعبیه‌شده در اسمبلی می‌نشینند — یعنی برنامه بدون هیچ
/// فایل جانبی و بدون پایگاه داده هم می‌تواند بالا بیاید، و نسخهٔ داده همیشه با
/// نسخهٔ کد یکی است.
/// </para>
/// <para>
/// دو مصرف‌کننده دارد: <c>DatabaseInitializer</c> که با آن پایگاه داده را پر
/// می‌کند، و مخزن‌های حافظه‌ای که وقتی هیچ پایگاه داده‌ای پیکربندی نشده جای آن را
/// می‌گیرند. هر دو از یک منبع و با یک نگاشت (<see cref="RowMapper"/>) می‌خوانند،
/// پس «حالت بدون دیتابیس» نسخهٔ دست‌کاری‌شدهٔ حقیقت نیست.
/// </para>
/// </remarks>
public sealed class SeedCatalog
{
    /// <summary>تنظیمات مشترک خواندن و نوشتن دادهٔ مرجع.</summary>
    /// <remarks>
    /// نوشتن هم از همین تنظیمات استفاده می‌کند تا هر چیزی که ذخیره می‌شود، با
    /// همان قاعده‌ای خوانده شود که نوشته شده.
    /// </remarks>
    internal static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: true) },
    };

    private SeedCatalog(
        IReadOnlyList<CityRow> cities,
        IReadOnlyList<PoiRow> pois,
        IReadOnlyList<VehicleRow> vehicles,
        string priceBookJson)
    {
        CityRows = cities;
        PoiRows = pois;
        VehicleRows = vehicles;
        RawPriceBookJson = priceBookJson;

        Cities = cities.Select(RowMapper.ToDomain).ToList();
        PointsOfInterest = pois.Select(RowMapper.ToDomain).ToList();
        Vehicles = vehicles.Select(RowMapper.ToDomain).ToList();
        PriceBook = ParsePriceBook(priceBookJson);
    }

    /// <summary>نمونهٔ مشترک — خواندن و نگاشت فقط یک‌بار انجام می‌شود.</summary>
    public static SeedCatalog Instance { get; } = Load();

    public IReadOnlyList<City> Cities { get; }

    public IReadOnlyList<PointOfInterest> PointsOfInterest { get; }

    public IReadOnlyList<Vehicle> Vehicles { get; }

    public PriceBook PriceBook { get; }

    /// <summary>ردیف‌های خام — ورودی پرکردن پایگاه داده.</summary>
    internal IReadOnlyList<CityRow> CityRows { get; }

    internal IReadOnlyList<PoiRow> PoiRows { get; }

    internal IReadOnlyList<VehicleRow> VehicleRows { get; }

    /// <summary>متن خام دفترچهٔ قیمت — همان چیزی که در پایگاه داده ذخیره می‌شود.</summary>
    internal string RawPriceBookJson { get; }

    /// <summary>خواندن دفترچهٔ قیمت از متن JSON — مسیر مشترک فایل اولیه و پایگاه داده.</summary>
    internal static PriceBook ParsePriceBook(string json) =>
        RowMapper.ToDomain(JsonSerializer.Deserialize<PriceBookContent>(json, SerializerOptions)
            ?? throw new InvalidOperationException("دفترچهٔ قیمت خالی است."));

    private static SeedCatalog Load() => new(
        Read<CityRow[]>("cities.json"),
        Read<PoiRow[]>("pois.json"),
        Read<VehicleRow[]>("vehicles.json"),
        ReadText("price-book.json"));

    private static Stream Open(string fileName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        string resource = $"LeaderTrip.Infrastructure.Seed.data.{fileName}";

        return assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException(
                $"منبع تعبیه‌شدهٔ «{resource}» پیدا نشد. آیا `npm run seed:export` اجرا شده است؟");
    }

    private static string ReadText(string fileName)
    {
        using var reader = new StreamReader(Open(fileName));

        return reader.ReadToEnd();
    }

    private static T Read<T>(string fileName)
    {
        using var stream = Open(fileName);

        return JsonSerializer.Deserialize<T>(stream, SerializerOptions)
            ?? throw new InvalidOperationException($"محتوای «{fileName}» خالی است.");
    }
}

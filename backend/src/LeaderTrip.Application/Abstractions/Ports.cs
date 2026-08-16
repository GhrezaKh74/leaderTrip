using LeaderTrip.Application.Prices.UpdatePriceBook;
using LeaderTrip.Domain.Common;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Scoring;
using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Application.Abstractions;

/// <summary>دسترسی به شهرها.</summary>
/// <remarks>
/// پورت‌ها عمداً باریک‌اند. یک <c>IDataAccess</c> چاق یعنی هر مصرف‌کننده به
/// چیزهایی وابسته می‌شود که لازم ندارد — نقض اصل تفکیک اینترفیس، و در عمل
/// یعنی تست‌هایی که باید ده متد بی‌ربط را جعل کنند.
/// </remarks>
public interface ICityRepository
{
    Task<IReadOnlyList<City>> GetAllAsync(CancellationToken cancellationToken);

    Task<City?> FindAsync(string id, CancellationToken cancellationToken);
}

public interface IPoiRepository
{
    Task<IReadOnlyList<PointOfInterest>> GetAllAsync(CancellationToken cancellationToken);
}

public interface IVehicleRepository
{
    Task<IReadOnlyList<Vehicle>> GetAllAsync(CancellationToken cancellationToken);

    Task<Vehicle?> FindAsync(string id, CancellationToken cancellationToken);
}

/// <summary>قیمت‌های پایهٔ جاری.</summary>
/// <remarks>
/// جدا از مخزن‌هاست چون منبعش می‌تواند فرق کند: پایگاه داده، فایل پیکربندی،
/// یا یک سرویس بیرونی. مصرف‌کننده نباید بداند کدام.
/// </remarks>
public interface IPriceBookProvider
{
    Task<PriceBook> GetCurrentAsync(CancellationToken cancellationToken);
}

/// <summary>پیش‌بینی آب‌وهوای بازهٔ سفر.</summary>
/// <remarks>
/// خروجی <see cref="WeatherOutlook"/> است، نه پاسخ خام سرویس هواشناسی: دامنه
/// «دمای بیشینه و احتمال بارش» می‌خواهد، نه ساختار JSON فلان API. اگر سرویس در
/// دسترس نبود <see langword="null"/> برمی‌گردد و برنامه بدون آب‌وهوا ساخته می‌شود —
/// هیچ ویژگی‌ای نباید به یک سرویس بیرونی گروگان باشد.
/// </remarks>
public interface IWeatherProvider
{
    Task<WeatherOutlook?> GetOutlookAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken);

    /// <summary>هوای هر روز سفر، برای نمایش. فهرست خالی یعنی داده‌ای نبود.</summary>
    Task<IReadOnlyList<DailyWeather>> GetDailyAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken);
}

/// <summary>وقتی هیچ سرویس هواشناسی پیکربندی نشده است.</summary>
public sealed class NoWeatherProvider : IWeatherProvider
{
    public Task<WeatherOutlook?> GetOutlookAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken) => Task.FromResult<WeatherOutlook?>(null);

    public Task<IReadOnlyList<DailyWeather>> GetDailyAsync(
        Coordinate location,
        DateOnly startDate,
        int days,
        CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<DailyWeather>>([]);
}

/// <summary>
/// پیش‌بارگذاری مسافت‌های واقعی جاده برای مجموعه‌ای از نقاط.
/// </summary>
/// <remarks>
/// <para>
/// <see cref="Domain.Routing.IRoadDistanceProvider"/> عمداً همگام است، چون در
/// دلِ حلقهٔ انتخاب مسیر صدا زده می‌شود و نباید هر مقایسه یک درخواست شبکه بزند.
/// این پورت پل آن شکاف است: یک‌بار به‌صورت ناهمگام ماتریس مسافت را می‌گیرد و پر
/// می‌کند، بعد دامنه همگام از آن می‌خواند.
/// </para>
/// <para>
/// پیاده‌سازی پیش‌فرض هیچ کاری نمی‌کند، پس مسیر بدون سرویس مسیریابی هم کار می‌کند.
/// </para>
/// </remarks>
public interface IRoadNetworkWarmup
{
    Task WarmAsync(IReadOnlyList<Coordinate> points, CancellationToken cancellationToken);
}

/// <summary>پیش‌بارگذاری بی‌اثر — برای وقتی سرویس مسیریابی وجود ندارد.</summary>
public sealed class NoRoadNetworkWarmup : IRoadNetworkWarmup
{
    public Task WarmAsync(IReadOnlyList<Coordinate> points, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}

/// <summary>انتشار نسخهٔ تازهٔ دفترچهٔ قیمت.</summary>
/// <remarks>
/// <para>
/// عمداً از <see cref="IPriceBookProvider"/> جداست: خواندن قیمت را همهٔ درخواست‌ها
/// انجام می‌دهند، نوشتنش را فقط یک اندپوینت مدیریتی. یکی‌کردنشان یعنی هر
/// مصرف‌کنندهٔ عادی به متدی وابسته شود که هرگز صدا نمی‌زند — و بدتر، متدی که
/// نباید بتواند صدا بزند.
/// </para>
/// <para>
/// اعتبارسنجی محتوا وظیفهٔ پیاده‌سازی است: نوشتن JSON خرابی که فردا هنگام خواندن
/// می‌ترکد، بدتر از رد کردن آن در همان لحظه است.
/// </para>
/// </remarks>
public interface IPriceBookWriter
{
    Task<Result<PriceBookVersionResponse>> PublishAsync(
        string payload,
        string updatedAt,
        CancellationToken cancellationToken);
}

/// <summary>وقتی پایگاه داده‌ای برای نوشتن وجود ندارد.</summary>
/// <remarks>
/// در حالت بدون پایگاه داده قیمت‌ها داخل باندل‌اند و تغییرشان جایی برای ماندن
/// ندارد. پذیرفتن درخواست و بی‌صدا دورانداختنش بدترین رفتار ممکن است — کاربر
/// فکر می‌کند قیمت‌ها به‌روز شده‌اند.
/// </remarks>
public sealed class ReadOnlyPriceBookWriter : IPriceBookWriter
{
    public Task<Result<PriceBookVersionResponse>> PublishAsync(
        string payload,
        string updatedAt,
        CancellationToken cancellationToken) =>
        Task.FromResult(Result.Failure<PriceBookVersionResponse>(DomainError.Conflict(
            "priceBook.readOnly",
            "این نمونه بدون پایگاه داده اجرا شده است و قیمت‌ها فقط‌خواندنی‌اند.")));
}

/// <summary>آب‌وهوای روزبه‌روز مسیر.</summary>
/// <remarks>
/// جدا از <see cref="IWeatherProvider"/> نیست، بخشی از آن است: خلاصهٔ سفر برای
/// امتیازدهی لازم است و جزئیات روزبه‌روز برای نمایش. یکی‌کردنشان یعنی صفحهٔ
/// برنامه مجبور شود میانگین را به‌جای هوای همان روز نشان دهد.
/// </remarks>
/// <param name="Date">تاریخ میلادی.</param>
/// <param name="MaxTemperature">بیشینهٔ دما.</param>
/// <param name="MinTemperature">کمینهٔ دما.</param>
/// <param name="PrecipitationProbability">احتمال بارش، ۰ تا ۱۰۰.</param>
/// <param name="HasSnow">آیا برف پیش‌بینی شده است.</param>
/// <param name="IsForecast">
/// «پیش‌بینی» یا «انتظار فصلی». دومی از بایگانی سال گذشته می‌آید و پیش‌بینی
/// نیست — در رابط کاربری هم همین‌طور برچسب می‌خورد.
/// </param>
public sealed record DailyWeather(
    DateOnly Date,
    double MaxTemperature,
    double MinTemperature,
    double PrecipitationProbability,
    bool HasSnow,
    bool IsForecast);

/// <summary>ارتفاع نقاط از سطح دریا.</summary>
/// <remarks>
/// در ایران خیلی از مسیرهای زیبا از گردنه‌های بالای ۲۰۰۰ متر می‌گذرند. همان
/// مسیری که در مهر دل‌انگیز است، در دی می‌تواند بسته باشد — و ارتفاع تنها چیزی
/// است که این ریسک را از پیش قابل دیدن می‌کند.
/// </remarks>
public interface IElevationProvider
{
    /// <summary>ارتفاع هر نقطه به متر، یا فهرست خالی اگر سرویس در دسترس نبود.</summary>
    Task<IReadOnlyList<double>> GetAsync(IReadOnlyList<Coordinate> points, CancellationToken cancellationToken);
}

/// <summary>وقتی سرویس ارتفاع پیکربندی نشده است.</summary>
public sealed class NoElevationProvider : IElevationProvider
{
    public Task<IReadOnlyList<double>> GetAsync(
        IReadOnlyList<Coordinate> points,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<double>>([]);
}

/// <summary>مکان خام کشف‌شده از OpenStreetMap.</summary>
/// <param name="OsmId">شناسهٔ OSM.</param>
/// <param name="Name">نام، همان‌طور که در OSM ثبت شده.</param>
/// <param name="Location">مختصات.</param>
/// <param name="Category">حدس ما از دستهٔ آن — و در رابط کاربری هم «حدس» برچسب می‌خورد.</param>
/// <param name="RawTag">تگ خام OSM، تا کاربر بداند با چه چیزی طرف است.</param>
public sealed record DiscoveredPlace(
    string OsmId,
    string Name,
    Coordinate Location,
    PoiCategory Category,
    string RawTag);

/// <summary>کشف جاذبه از OpenStreetMap.</summary>
/// <remarks>
/// <para>
/// این‌ها وارد پایگاه دادهٔ اصلی نمی‌شوند. امتیازدهی ما به فیلدهایی تکیه دارد
/// که OSM ندارد — مدت بازدید، سختی مسیر، بلیت، تناسب سنی، نیاز به شاسی‌بلند.
/// ریختن دادهٔ خام در دیتاست، همان چیزی را خراب می‌کند که ارزش محصول است.
/// </para>
/// <para>
/// نقشش پرکردن حفرهٔ پوشش است: هرچه پیدا شد با برچسب «دادهٔ خام» نشان داده
/// می‌شود و کاربر می‌تواند آن را به‌عنوان توقف دلخواه اضافه کند — جایی که خودش
/// مدت و هزینه را تعیین می‌کند.
/// </para>
/// </remarks>
public interface IPlaceDiscovery
{
    Task<IReadOnlyList<DiscoveredPlace>> SearchAsync(
        Coordinate centre,
        double radiusKm,
        CancellationToken cancellationToken);
}

/// <summary>وقتی سرویس کشف پیکربندی نشده است.</summary>
public sealed class NoPlaceDiscovery : IPlaceDiscovery
{
    public Task<IReadOnlyList<DiscoveredPlace>> SearchAsync(
        Coordinate centre,
        double radiusKm,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<DiscoveredPlace>>([]);
}

/// <summary>عکس ذخیره‌شده — فقط شناسه؛ نشانی را لایهٔ وب می‌سازد.</summary>
public sealed record StoredPhoto(string Id);

/// <summary>محتوای یک عکس برای برگرداندن به کلاینت.</summary>
/// <remarks>بستن <see cref="Content"/> با گیرنده است.</remarks>
public sealed record PhotoContent(Stream Content, string ContentType, long Length);

/// <summary>ذخیرهٔ عکس‌های چک‌این.</summary>
/// <remarks>
/// <para>
/// عمداً از دفترچهٔ سفر جداست: دفترچه (ساعت‌ها، امتیازها، هزینه‌ها) روی دستگاه
/// کاربر می‌ماند و سرور فقط بایت‌های عکس را نگه می‌دارد — بدون دانستن اینکه عکس
/// متعلق به کدام سفر یا کدام توقف است. کم‌دانی سرور یک تصمیم است، نه کمبود.
/// </para>
/// <para>
/// اعتبارسنجی محتوا وظیفهٔ پیاده‌سازی است: نوع واقعی فایل از امضای باینری آن
/// تشخیص داده می‌شود، نه از هدر HTTP که هر کلاینتی هرچه بخواهد می‌فرستد.
/// </para>
/// </remarks>
public interface IPhotoStore
{
    /// <summary>ذخیرهٔ عکس؛ شناسهٔ تولیدشده را برمی‌گرداند یا خطای اعتبارسنجی.</summary>
    Task<Result<StoredPhoto>> SaveAsync(
        Stream content,
        long declaredLength,
        CancellationToken cancellationToken);

    /// <summary>بازکردن عکس با شناسه؛ <see langword="null"/> یعنی وجود ندارد.</summary>
    Task<PhotoContent?> OpenAsync(string id, CancellationToken cancellationToken);
}

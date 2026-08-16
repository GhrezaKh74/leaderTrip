using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Infrastructure.External;
using LeaderTrip.Infrastructure.External.Discovery;
using LeaderTrip.Infrastructure.External.Elevation;
using LeaderTrip.Infrastructure.External.Routing;
using LeaderTrip.Infrastructure.External.Weather;
using LeaderTrip.Infrastructure.Persistence;
using LeaderTrip.Infrastructure.Persistence.Repositories;
using LeaderTrip.Infrastructure.Photos;
using LeaderTrip.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure;

/// <summary>ثبت آداپترهای بیرونی.</summary>
public static class DependencyInjection
{
    /// <summary>نام رشتهٔ اتصال؛ نبودنش خطا نیست — حالت بدون پایگاه داده را روشن می‌کند.</summary>
    public const string ConnectionStringName = "LeaderTrip";

    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddMemoryCache();
        services.TryAddSingleton(TimeProvider.System);

        services.AddOptions<RoutingOptions>()
            .Bind(configuration.GetSection(RoutingOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<WeatherOptions>()
            .Bind(configuration.GetSection(WeatherOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<DiscoveryOptions>()
            .Bind(configuration.GetSection(DiscoveryOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<PhotoOptions>()
            .Bind(configuration.GetSection(PhotoOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Singleton چون بدون حالت است و پوشه را یک‌بار در ساخت می‌سازد.
        services.AddSingleton<IPhotoStore, FileSystemPhotoStore>();

        AddDataAccess(services, configuration);
        AddRouting(services);
        AddWeather(services);
        AddDiscovery(services);

        return services;
    }

    /// <summary>
    /// با رشتهٔ اتصال، EF Core؛ بدون آن، دادهٔ همراه برنامه.
    /// </summary>
    /// <remarks>
    /// این «حالت اسباب‌بازی» نیست. هر دو مسیر از یک <see cref="SeedCatalog"/>
    /// تغذیه می‌شوند، پس تفاوتشان فقط در جای نگهداری داده است — نه در محتوایش.
    /// نتیجه‌اش این است که هیچ‌کدام از تست یکپارچگی، دموی محلی و اجرای اولین
    /// بار، به بالا بودن یک سرور Postgres گره نمی‌خورد.
    /// </remarks>
    private static void AddDataAccess(IServiceCollection services, IConfiguration configuration)
    {
        string? connectionString = configuration.GetConnectionString(ConnectionStringName);

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddScoped<ICityRepository, SeedCityRepository>();
            services.AddScoped<IPoiRepository, SeedPoiRepository>();
            services.AddScoped<IVehicleRepository, SeedVehicleRepository>();
            services.AddScoped<IPriceBookProvider, SeedPriceBookProvider>();

            // بدون پایگاه داده جایی برای نوشتن نیست. پیش‌فرضِ لایهٔ Application
            // (ReadOnlyPriceBookWriter) صریحاً خطا برمی‌گرداند، نه سکوت.
            return;
        }

        services.AddDbContext<LeaderTripDbContext>(options => options
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsAssembly(typeof(LeaderTripDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention());

        services.AddScoped<ICityRepository, EfCityRepository>();
        services.AddScoped<IPoiRepository, EfPoiRepository>();
        services.AddScoped<IVehicleRepository, EfVehicleRepository>();
        services.AddScoped<IPriceBookProvider, EfPriceBookProvider>();
        services.AddScoped<IPriceBookWriter, EfPriceBookWriter>();

        // با پایگاه داده، حساب‌ها هم آن‌جا می‌مانند؛ ثبتِ متأخر بر پیش‌فرض
        // حافظه‌ایِ لایهٔ Application برنده می‌شود.
        services.AddScoped<EfAuthStore>();
        services.AddScoped<Application.Auth.IUserStore>(sp => sp.GetRequiredService<EfAuthStore>());
        services.AddScoped<Application.Auth.ISessionStore>(sp => sp.GetRequiredService<EfAuthStore>());
        services.AddScoped<Application.Auth.ISavedTripStore>(sp => sp.GetRequiredService<EfAuthStore>());

        services.AddSingleton<DatabaseInitializer>();
    }

    /// <summary>
    /// آداپتر OSRM، پوشیده در تزئین‌گر کش.
    /// </summary>
    /// <remarks>
    /// دو ثبت جدا برای یک نمونه: دامنه آن را به‌عنوان
    /// <see cref="IRoadDistanceProvider"/> می‌بیند و لایهٔ Application به‌عنوان
    /// <see cref="IRoadNetworkWarmup"/>. هیچ‌کدام نمی‌دانند طرف دیگر وجود دارد،
    /// و ماتریسی که یکی پر می‌کند همانی است که دیگری می‌خواند.
    /// </remarks>
    private static void AddRouting(IServiceCollection services)
    {
        services.AddHttpClient<OsrmRoadDistanceProvider>((provider, client) =>
        {
            var options = GetOptions<RoutingOptions>(provider);
            client.BaseAddress = options.BaseAddress;
            client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        });

        services.RemoveAll<IRoadDistanceProvider>();
        services.RemoveAll<IRoadNetworkWarmup>();

        services.AddScoped<IRoadNetworkWarmup>(sp => sp.GetRequiredService<OsrmRoadDistanceProvider>());
        services.AddScoped<IRoadDistanceProvider>(sp => new CachingRoadDistanceProvider(
            sp.GetRequiredService<OsrmRoadDistanceProvider>(),
            sp.GetRequiredService<IMemoryCache>(),
            sp.GetRequiredService<IOptions<RoutingOptions>>()));
    }

    private static void AddWeather(IServiceCollection services)
    {
        services.AddHttpClient(HttpClients.WeatherForecast, (provider, client) =>
        {
            var options = GetOptions<WeatherOptions>(provider);
            client.BaseAddress = options.ForecastAddress;
            client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        });

        services.AddHttpClient(HttpClients.WeatherArchive, (provider, client) =>
        {
            var options = GetOptions<WeatherOptions>(provider);
            client.BaseAddress = options.ArchiveAddress;
            client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        });

        services.RemoveAll<IWeatherProvider>();
        services.AddScoped<IWeatherProvider, OpenMeteoWeatherProvider>();

        // ارتفاع از همان میزبان Open-Meteo می‌آید، پس کلاینت مشترک است.
        services.RemoveAll<IElevationProvider>();
        services.AddScoped<IElevationProvider, OpenMeteoElevationProvider>();
    }

    private static void AddDiscovery(IServiceCollection services)
    {
        services.AddHttpClient<OverpassPlaceDiscovery>((provider, client) =>
        {
            var options = GetOptions<DiscoveryOptions>(provider);
            client.BaseAddress = options.BaseAddress;
            client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        });

        services.RemoveAll<IPlaceDiscovery>();
        services.AddScoped<IPlaceDiscovery>(sp => sp.GetRequiredService<OverpassPlaceDiscovery>());
    }

    private static TOptions GetOptions<TOptions>(IServiceProvider provider)
        where TOptions : class =>
        provider.GetRequiredService<IOptions<TOptions>>().Value;
}

/// <summary>نام کلاینت‌های نام‌دار HTTP.</summary>
internal static class HttpClients
{
    public const string WeatherForecast = "weather.forecast";

    public const string WeatherArchive = "weather.archive";
}

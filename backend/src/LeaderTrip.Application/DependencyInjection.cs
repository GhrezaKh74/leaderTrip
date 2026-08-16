using FluentValidation;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Auth;
using LeaderTrip.Application.Behaviors;
using LeaderTrip.Application.Prices.UpdatePriceBook;
using LeaderTrip.Application.Reference.DiscoverPlaces;
using LeaderTrip.Application.Reference.GetPois;
using LeaderTrip.Application.Reference.GetReferenceData;
using LeaderTrip.Application.Trips.GeneratePlan;
using LeaderTrip.Application.Trips.OptimizeBudget;
using LeaderTrip.Domain.Planning;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Domain.Pricing.Components;
using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.Scoring;
using LeaderTrip.Domain.Scoring.Rules;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LeaderTrip.Application;

/// <summary>ثبت سرویس‌های لایهٔ Application و دامنه.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IDispatcher, Dispatcher>();

        // ─── پیش‌فرض‌های بی‌خطر برای پورت‌های اختیاری ───
        // `TryAdd` یعنی اگر لایهٔ Infrastructure پیاده‌سازی واقعی ثبت کرده باشد،
        // این‌ها کنار می‌روند. بدون آن‌ها، نبودِ سرویس بیرونی = خطای زمان اجرا؛
        // با آن‌ها، نبودِ سرویس = برنامه‌ای که فقط آب‌وهوا ندارد.
        services.TryAddScoped<IWeatherProvider, NoWeatherProvider>();
        services.TryAddScoped<IRoadNetworkWarmup, NoRoadNetworkWarmup>();
        services.TryAddScoped<IElevationProvider, NoElevationProvider>();
        services.TryAddScoped<IPlaceDiscovery, NoPlaceDiscovery>();
        services.TryAddScoped<IRouteGeometryProvider, NoRouteGeometryProvider>();
        services.TryAddSingleton<IRoadDistanceProvider>(NoRoadDistanceProvider.Instance);

        // ─── قاعده‌های امتیازدهی ───
        // افزودن قاعدهٔ تازه یعنی یک خط این‌جا و یک کلاس تازه؛ هیچ کد موجودی
        // دست نمی‌خورد. همان اصل باز/بسته، به‌شکل عملی.
        services.AddScoped<IPoiScoringRule, InterestMatchRule>();
        services.AddScoped<IPoiScoringRule, GeneralQualityRule>();
        services.AddScoped<IPoiScoringRule, SeasonFitRule>();
        services.AddScoped<IPoiScoringRule, AgeSuitabilityRule>();
        services.AddScoped<IPoiScoringRule, DetourPenaltyRule>();
        services.AddScoped<IPoiScoringRule, TicketAffordabilityRule>();
        services.AddScoped<IPoiScoringRule, WeatherSuitabilityRule>();
        services.AddScoped<IPoiScoringRule, LearnedTasteRule>();
        services.AddScoped<IPoiScoringRule, PinnedByUserRule>();
        services.AddScoped<PoiScorer>();

        // ─── اجزای هزینه ───
        services.AddScoped<ICostComponent, FuelCost>();
        services.AddScoped<ICostComponent, TollCost>();
        services.AddScoped<ICostComponent, LodgingCost>();
        services.AddScoped<ICostComponent, MealsCost>();
        services.AddScoped<ICostComponent, SnacksCost>();
        services.AddScoped<ICostComponent, TicketsCost>();
        services.AddScoped<ICostComponent, DepreciationCost>();
        services.AddScoped<CostCalculator>();

        services.AddScoped<TravelPlanner>();
        services.AddScoped<ItinerarySelector>();
        services.AddScoped<DayScheduler>();

        // ─── مسئول‌ها، پوشیده در تزئین‌گر اعتبارسنجی ───
        services.AddScoped<GeneratePlanHandler>();
        services.AddScoped<IQueryHandler<GeneratePlanQuery, TripPlanResponse>>(sp =>
            new ValidationDecorator<GeneratePlanQuery, TripPlanResponse>(
                sp.GetRequiredService<GeneratePlanHandler>(),
                sp.GetService<IValidator<GeneratePlanQuery>>()));

        services.AddScoped<IValidator<GeneratePlanQuery>, GeneratePlanValidator>();

        // ─── دادهٔ مرجع ───
        services.AddScoped<GetReferenceDataHandler>();
        services.AddScoped<IQueryHandler<GetReferenceDataQuery, ReferenceDataResponse>>(sp =>
            new ValidationDecorator<GetReferenceDataQuery, ReferenceDataResponse>(
                sp.GetRequiredService<GetReferenceDataHandler>(),
                sp.GetService<IValidator<GetReferenceDataQuery>>()));

        services.AddScoped<GetPoisHandler>();
        services.AddScoped<IQueryHandler<GetPoisQuery, PoiListResponse>>(sp =>
            new ValidationDecorator<GetPoisQuery, PoiListResponse>(
                sp.GetRequiredService<GetPoisHandler>(),
                sp.GetService<IValidator<GetPoisQuery>>()));

        services.AddScoped<DiscoverPlacesHandler>();
        services.AddScoped<IQueryHandler<DiscoverPlacesQuery, DiscoveredPlacesResponse>>(sp =>
            sp.GetRequiredService<DiscoverPlacesHandler>());

        // ─── بهینه‌ساز بودجه ───
        // مسئولِ برنامه را از ظرف می‌گیرد، یعنی همان مسیرِ اعتبارسنجی‌شده را چند
        // بار اجرا می‌کند. صرفه‌جویی‌ها از اجرای واقعی می‌آیند، نه از تخمین.
        services.AddScoped<OptimizeBudgetHandler>();
        services.AddScoped<IQueryHandler<OptimizeBudgetQuery, BudgetLeversResponse>>(sp =>
            sp.GetRequiredService<OptimizeBudgetHandler>());

        // ─── مدیریت قیمت ───
        services.TryAddScoped<IPriceBookWriter, ReadOnlyPriceBookWriter>();
        services.AddScoped<UpdatePriceBookHandler>();
        services.AddScoped<ICommandHandler<UpdatePriceBookCommand, PriceBookVersionResponse>>(sp =>
            new CommandValidationDecorator<UpdatePriceBookCommand, PriceBookVersionResponse>(
                sp.GetRequiredService<UpdatePriceBookHandler>(),
                sp.GetService<IValidator<UpdatePriceBookCommand>>()));

        services.AddScoped<IValidator<UpdatePriceBookCommand>, UpdatePriceBookValidator>();

        // ─── احراز هویت ───
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();

        // پیش‌فرضِ بدون پایگاه داده: انبار حافظه‌ای. `TryAdd` یعنی وقتی
        // Infrastructure نسخهٔ EF را ثبت کند، این‌ها کنار می‌روند.
        services.TryAddSingleton<InMemoryAuthStore>();
        services.TryAddSingleton<IUserStore>(sp => sp.GetRequiredService<InMemoryAuthStore>());
        services.TryAddSingleton<ISessionStore>(sp => sp.GetRequiredService<InMemoryAuthStore>());
        services.TryAddSingleton<ISavedTripStore>(sp => sp.GetRequiredService<InMemoryAuthStore>());

        services.AddScoped<RegisterHandler>();
        services.AddScoped<ICommandHandler<RegisterCommand, AuthResponse>>(sp =>
            new CommandValidationDecorator<RegisterCommand, AuthResponse>(
                sp.GetRequiredService<RegisterHandler>(),
                sp.GetService<IValidator<RegisterCommand>>()));

        services.AddScoped<IValidator<RegisterCommand>, RegisterValidator>();

        services.AddScoped<LoginHandler>();
        services.AddScoped<ICommandHandler<LoginCommand, AuthResponse>>(sp =>
            new CommandValidationDecorator<LoginCommand, AuthResponse>(
                sp.GetRequiredService<LoginHandler>(),
                sp.GetService<IValidator<LoginCommand>>()));

        services.AddScoped<IValidator<LoginCommand>, LoginValidator>();

        return services;
    }
}

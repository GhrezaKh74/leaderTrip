using FluentValidation;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Behaviors;
using LeaderTrip.Application.Trips.GeneratePlan;
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

        return services;
    }
}

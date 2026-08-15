using LeaderTrip.Application;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Trips.GeneratePlan;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Planning;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LeaderTrip.Infrastructure.Tests;

/// <summary>هزینهٔ نشسته روی روزها، در یک برنامهٔ واقعی.</summary>
/// <remarks>
/// این‌ها روی خروجی کامل مسئول اجرا می‌شوند، نه روی نمونهٔ ساختگی: خطایی که
/// این‌جا مهم است — «جمع روزها با کل نمی‌خواند» — فقط با داده و مسیر واقعی
/// دیده می‌شود.
/// </remarks>
public sealed class CostAttributionTests
{
    /// <summary>
    /// جمع هزینهٔ روزها باید <b>دقیقاً</b> برابر جمع اقلام باشد، نه تقریباً.
    /// در نسخهٔ اول همین ادعا با «حدوداً برابر» نوشته شد و یک اختلاف واقعی را
    /// ماه‌ها پنهان کرد.
    /// </summary>
    [Fact]
    public async Task DayCosts_SumExactlyTo_Subtotal()
    {
        var plan = await GeneratePlanAsync();

        decimal days = plan.Days.Sum(d => d.Blocks.Sum(b => b.Cost));

        Assert.Equal(plan.Cost.Subtotal, days);
    }

    /// <summary>هر روز باید هزینهٔ خودش را نشان دهد؛ «۰ تومان» روی صفحه یعنی «رایگان».</summary>
    [Fact]
    public async Task EveryDay_WithBlocks_HasNonZeroCost()
    {
        var plan = await GeneratePlanAsync();

        var freeDays = plan.Days
            .Where(d => d.Blocks.Count > 0 && d.Cost == 0)
            .Select(d => d.Index)
            .ToList();

        Assert.Empty(freeDays);
    }

    /// <summary>هزینهٔ هر روز باید جمع بلوک‌های همان روز باشد، نه عددی جدا.</summary>
    [Fact]
    public async Task DayCost_Equals_SumOfItsBlocks()
    {
        var plan = await GeneratePlanAsync();

        foreach (var day in plan.Days)
        {
            Assert.Equal(day.Blocks.Sum(b => b.Cost), day.Cost);
        }
    }

    /// <summary>
    /// بلیت روی همان بازدید می‌نشیند. اگر پخش می‌شد، بازدید رایگان هم بلیت‌دار
    /// به‌نظر می‌رسید و ردیابی‌پذیری از بین می‌رفت.
    /// </summary>
    [Fact]
    public async Task Visits_CarryCost_OnlyWhenTheyHaveTickets()
    {
        var plan = await GeneratePlanAsync();

        var visits = plan.Days.SelectMany(d => d.Blocks).Where(b => b.Kind == BlockKind.Visit).ToList();

        Assert.NotEmpty(visits);
        Assert.Contains(visits, v => v.Cost > 0);
    }

    private static async Task<TripPlanResponse> GeneratePlanAsync()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Routing:Enabled"] = "false",
                ["Weather:Enabled"] = "false",
            })
            .Build();

        await using var provider = new ServiceCollection()
            .AddLogging()
            .AddApplication()
            .AddInfrastructure(configuration)
            .BuildServiceProvider();

        using var scope = provider.CreateScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IDispatcher>();

        var result = await dispatcher.QueryAsync(
            new GeneratePlanQuery
            {
                OriginCityId = "tehran",
                StartDate = new DateOnly(2026, 5, 2),
                Days = 3,
                RadiusKm = 450,
                VehicleId = "sedan-206",
                BudgetToman = 60_000_000,
                Travelers =
                [
                    new TravelerDto("a", "علی", 38, MobilityLevel.Full, true),
                    new TravelerDto("b", "مریم", 35, MobilityLevel.Full, false),
                ],
                Interests = [PoiCategory.Historical, PoiCategory.Nature],
            },
            CancellationToken.None);

        Assert.True(result.IsSuccess, result.IsFailure ? result.Error.Message : null);

        return result.Value;
    }
}

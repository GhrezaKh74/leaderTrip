using LeaderTrip.Application;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Trips.GeneratePlan;
using LeaderTrip.Domain.Enums;
using LeaderTrip.Domain.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LeaderTrip.Infrastructure.Tests;

/// <summary>ترکیب واقعی لایه‌ها، از تزریق وابستگی تا یک برنامهٔ ساخته‌شده.</summary>
/// <remarks>
/// <para>
/// تست‌های دامنه ثابت می‌کنند فرمول‌ها درست‌اند؛ این ثابت می‌کند سیم‌کشی درست است.
/// دو خطای متفاوت‌اند و اولی دومی را نمی‌گیرد: موتوری که بی‌عیب کار می‌کند ولی
/// وابستگی‌اش ثبت نشده، در تولید هنگام اولین درخواست می‌ترکد.
/// </para>
/// <para>
/// بدون شبکه و بدون پایگاه داده اجرا می‌شود — دقیقاً همان مسیری که یک توسعه‌دهندهٔ
/// تازه با <c>dotnet run</c> می‌گیرد.
/// </para>
/// </remarks>
public sealed class CompositionTests
{
    [Fact]
    public async Task Container_Builds_AndProducesAPlan()
    {
        await using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        var dispatcher = scope.ServiceProvider.GetRequiredService<IDispatcher>();

        var result = await dispatcher.QueryAsync(SampleTrip, CancellationToken.None);

        Assert.True(result.IsSuccess, result.IsFailure ? result.Error.Message : null);

        var plan = result.Value;

        Assert.Equal(3, plan.Days.Count);
        Assert.True(plan.VisitCount > 0, "برنامه‌ای بدون هیچ بازدیدی، برنامه نیست.");
        Assert.True(plan.Cost.Total > 0);

        // بدون سرویس مسیریابی، عدد باید خودش را تخمین اعلام کند — نه اندازه‌گیری.
        Assert.Equal(DistanceSource.Estimated, plan.DistanceSource);
    }

    /// <summary>
    /// خروجی «هزینهٔ کل» باید دقیقاً جمع اجزایش باشد. اگر نبود، گزارشی که ادعا
    /// می‌کند هر قلم قابل ردیابی است دروغ می‌گوید.
    /// </summary>
    [Fact]
    public async Task TotalCost_IsExactly_TheSumOfItsParts()
    {
        await using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        var dispatcher = scope.ServiceProvider.GetRequiredService<IDispatcher>();
        var plan = (await dispatcher.QueryAsync(SampleTrip, CancellationToken.None)).Value;

        decimal lines = plan.Cost.Lines.Sum(l => l.Amount);

        Assert.Equal(lines, plan.Cost.Subtotal);
        Assert.Equal(
            plan.Cost.Subtotal + plan.Cost.Miscellaneous + plan.Cost.RiskBuffer,
            plan.Cost.Total);
    }

    [Fact]
    public async Task InvalidRequest_FailsValidation_WithoutThrowing()
    {
        await using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        var dispatcher = scope.ServiceProvider.GetRequiredService<IDispatcher>();

        var result = await dispatcher.QueryAsync(
            SampleTrip with { Days = 0 },
            CancellationToken.None);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task UnknownCity_IsReported_NotThrown()
    {
        await using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        var dispatcher = scope.ServiceProvider.GetRequiredService<IDispatcher>();

        var result = await dispatcher.QueryAsync(
            SampleTrip with { OriginCityId = "atlantis" },
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("atlantis", result.Error.Message, StringComparison.Ordinal);
    }

    private static GeneratePlanQuery SampleTrip => new()
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
            new TravelerDto("c", "سارا", 9, MobilityLevel.Full, false),
        ],
        Interests = [PoiCategory.Historical, PoiCategory.Nature],
    };

    /// <summary>
    /// سرویس‌های بیرونی خاموش‌اند. تستی که به اینترنت وابسته باشد، تست نیست —
    /// گاهی سبز است و گاهی قرمز، و هیچ‌کدام دربارهٔ کد چیزی نمی‌گوید.
    /// </summary>
    private static ServiceProvider BuildProvider()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Routing:Enabled"] = "false",
                ["Weather:Enabled"] = "false",
            })
            .Build();

        return new ServiceCollection()
            .AddLogging()
            .AddApplication()
            .AddInfrastructure(configuration)
            .BuildServiceProvider(new ServiceProviderOptions
            {
                ValidateScopes = true,
                ValidateOnBuild = true,
            });
    }
}

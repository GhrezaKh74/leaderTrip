using FluentValidation;

namespace LeaderTrip.Application.Trips.GeneratePlan;

/// <summary>قواعد اعتبارسنجی درخواست ساخت برنامه.</summary>
public sealed class GeneratePlanValidator : AbstractValidator<GeneratePlanQuery>
{
    public GeneratePlanValidator()
    {
        RuleFor(q => q.OriginCityId).NotEmpty().WithMessage("شهر مبدأ لازم است.");

        RuleFor(q => q.VehicleId).NotEmpty().WithMessage("انتخاب خودرو لازم است.");

        RuleFor(q => q.Days)
            .InclusiveBetween(1, 30)
            .WithMessage("تعداد روز باید بین ۱ تا ۳۰ باشد.");

        RuleFor(q => q.RadiusKm)
            .InclusiveBetween(10, 2000)
            .WithMessage("شعاع جست‌وجو باید بین ۱۰ تا ۲۰۰۰ کیلومتر باشد.");

        RuleFor(q => q.Travelers)
            .NotEmpty()
            .WithMessage("حداقل یک همسفر لازم است.");

        RuleForEach(q => q.Travelers).ChildRules(t =>
            t.RuleFor(x => x.Age)
             .InclusiveBetween(0, 120)
             .WithMessage("سن همسفر باید بین ۰ تا ۱۲۰ باشد."));

        RuleFor(q => q.MaxDrivingHoursPerDay)
            .InclusiveBetween(1, 14)
            .WithMessage("سقف رانندگی روزانه باید بین ۱ تا ۱۴ ساعت باشد.");

        RuleFor(q => q.VehicleCount).GreaterThan(0);

        RuleFor(q => q.SubsidizedFuelShare).InclusiveBetween(0m, 1m);

        RuleFor(q => q.BudgetToman).GreaterThanOrEqualTo(0);

        RuleFor(q => q.DayEndHour)
            .GreaterThan(q => q.DayStartHour)
            .WithMessage("پایان روز باید بعد از شروع روز باشد.");
    }
}

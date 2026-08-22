using FluentValidation;

namespace LeaderTrip.Application.Trips.GeneratePlan;

/// <summary>قواعد اعتبارسنجی درخواست ساخت برنامه.</summary>
public sealed class GeneratePlanValidator : AbstractValidator<GeneratePlanQuery>
{
    public GeneratePlanValidator()
    {
        RuleFor(q => q.OriginCityId).NotEmpty().WithMessage("شهر مبدأ لازم است.");

        RuleFor(q => q.DestinationCityId)
            .Must((query, destination) => destination is null
                || !string.Equals(destination, query.OriginCityId, StringComparison.Ordinal))
            .WithMessage("مقصد نمی‌تواند همان شهر مبدأ باشد؛ برای سفر حلقه‌ای، مقصد را خالی بگذارید.");

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

        RuleFor(q => q.VehicleCount)
            .GreaterThan(0)
            .WithMessage("تعداد خودرو باید دست‌کم ۱ باشد.");

        RuleFor(q => q.SubsidizedFuelShare)
            .InclusiveBetween(0m, 1m)
            .WithMessage("سهم سوخت سهمیه‌ای باید بین ۰ و ۱ باشد.");

        RuleFor(q => q.BudgetToman)
            .GreaterThanOrEqualTo(0)
            .WithMessage("بودجه نمی‌تواند منفی باشد.");

        RuleFor(q => q.DayEndHour)
            .GreaterThan(q => q.DayStartHour)
            .WithMessage("پایان روز باید بعد از شروع روز باشد.");

        RuleFor(q => q.FirstDayStartHour)
            .Must((query, hour) => hour is null || (hour >= 0 && hour < query.DayEndHour - 2))
            .WithMessage("ساعت حرکت روز اول باید دست‌کم دو ساعت پیش از پایان روز باشد.");

        RuleFor(q => q.CustomStops)
            .Must(stops => stops.Count <= 20)
            .WithMessage("حداکثر ۲۰ توقف دلخواه ممکن است.");

        RuleForEach(q => q.CustomStops).ChildRules(stop =>
        {
            stop.RuleFor(s => s.Name)
                .NotEmpty().WithMessage("توقف دلخواه عنوان لازم دارد.")
                .MaximumLength(80).WithMessage("عنوان توقف دلخواه بلندتر از حد است.");

            // چهارگوش دربرگیرندهٔ ایران — این محصول سفر جاده‌ای داخل ایران است.
            stop.RuleFor(s => s.Lat)
                .InclusiveBetween(24, 41)
                .WithMessage("مختصات توقف دلخواه بیرون از ایران است.");

            stop.RuleFor(s => s.Lng)
                .InclusiveBetween(43, 64)
                .WithMessage("مختصات توقف دلخواه بیرون از ایران است.");

            stop.RuleFor(s => s.VisitMinutes)
                .InclusiveBetween(15, 600)
                .WithMessage("مدت بازدید توقف دلخواه باید بین ۱۵ دقیقه تا ۱۰ ساعت باشد.");
        });
    }
}

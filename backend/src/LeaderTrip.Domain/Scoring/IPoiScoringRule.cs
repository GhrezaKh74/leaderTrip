using LeaderTrip.Domain.Entities;

namespace LeaderTrip.Domain.Scoring;

/// <summary>یک قاعدهٔ امتیازدهی مستقل.</summary>
/// <remarks>
/// هر قاعده یک دلیل برای تغییر دارد و جداگانه تست می‌شود. افزودن قاعدهٔ تازه
/// یعنی یک کلاس تازه و یک ثبت در DI — نه ویرایش تابعی ۸۰ خطی که همهٔ قاعده‌ها
/// در آن جمع شده‌اند.
/// </remarks>
public interface IPoiScoringRule
{
    /// <summary>نامی که در تفکیک امتیاز به کاربر نشان داده می‌شود.</summary>
    string Name { get; }

    ScoreContribution Evaluate(PointOfInterest poi, ScoringContext context);
}

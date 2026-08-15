namespace LeaderTrip.Domain.Pricing;

/// <summary>یک جزء از هزینهٔ سفر.</summary>
/// <remarks>
/// هر قلم هزینه یک کلاس است. جمع کل، حاصل جمع اجزاست و هیچ‌جا عدد جادویی
/// اضافه نمی‌شود — چیزی که در نسخهٔ اول با تست «جمع هزینهٔ روزها دقیقاً برابر
/// زیرجمع کل» تضمین شده بود و این‌جا خودِ ساختار تضمینش می‌کند.
/// </remarks>
public interface ICostComponent
{
    /// <summary>ترتیب نمایش — کوچک‌تر بالاتر.</summary>
    int Order { get; }

    CostLine Calculate(CostContext context);
}

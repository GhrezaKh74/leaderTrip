using LeaderTrip.Domain.ValueObjects;

namespace LeaderTrip.Domain.Pricing;

/// <summary>یک قلم هزینه، به‌همراه توضیح اینکه از کجا آمده.</summary>
/// <param name="Key">شناسهٔ ماشینی — برای تطبیق با هزینهٔ واقعی ثبت‌شده.</param>
/// <param name="Label">عنوان خوانا.</param>
/// <param name="Amount">مبلغ.</param>
/// <param name="Formula">فرمول خوانا؛ اصل محصول این است که هیچ عددی بدون توضیح نباشد.</param>
public sealed record CostLine(string Key, string Label, Money Amount, string Formula);

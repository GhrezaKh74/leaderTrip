namespace LeaderTrip.Domain.Scoring;

/// <summary>امتیاز نهایی یک جاذبه، به‌همراه سهم تک‌تک قاعده‌ها.</summary>
/// <remarks>
/// تفکیک نگه داشته می‌شود چون اصل محصول این است که هیچ عددی بدون توضیح
/// نمایش داده نشود — امتیاز هم عدد است.
/// </remarks>
public sealed record PoiScore(double Value, IReadOnlyList<ScoreBreakdownItem> Breakdown);

public sealed record ScoreBreakdownItem(string RuleName, ScoreContribution Contribution);

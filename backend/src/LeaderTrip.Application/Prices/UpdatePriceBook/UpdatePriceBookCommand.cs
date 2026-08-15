using FluentValidation;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;

namespace LeaderTrip.Application.Prices.UpdatePriceBook;

/// <summary>انتشار نسخهٔ تازه‌ای از دفترچهٔ قیمت.</summary>
/// <remarks>
/// این تنها دلیلی است که در <see href="../../../../../docs/06-rewrite-architecture.md">سند ۶</see>
/// برای داشتن بک‌اند در صدر فهرست آمد: در ایران قیمت‌ها ماه‌به‌ماه عوض می‌شوند و
/// در نسخهٔ اول هر به‌روزرسانی قیمت یعنی انتشار نسخهٔ جدید اپ.
/// </remarks>
public sealed record UpdatePriceBookCommand : ICommand<PriceBookVersionResponse>
{
    /// <summary>محتوای دفترچه به‌صورت JSON — همان شکلی که خوانده می‌شود.</summary>
    public required string Payload { get; init; }

    /// <summary>برچسب تاریخ برای نمایش، مثل «۱۴۰۴/۰۶».</summary>
    public required string UpdatedAt { get; init; }
}

public sealed record PriceBookVersionResponse(int Version, DateTimeOffset EffectiveFrom, string UpdatedAt);

internal sealed class UpdatePriceBookValidator : AbstractValidator<UpdatePriceBookCommand>
{
    public UpdatePriceBookValidator()
    {
        RuleFor(c => c.Payload).NotEmpty().WithMessage("محتوای دفترچهٔ قیمت خالی است.");
        RuleFor(c => c.UpdatedAt).NotEmpty().MaximumLength(32);
    }
}

internal sealed class UpdatePriceBookHandler
    : ICommandHandler<UpdatePriceBookCommand, PriceBookVersionResponse>
{
    private readonly IPriceBookWriter _writer;

    public UpdatePriceBookHandler(IPriceBookWriter writer) => _writer = writer;

    public Task<Result<PriceBookVersionResponse>> HandleAsync(
        UpdatePriceBookCommand command,
        CancellationToken cancellationToken) =>
        _writer.PublishAsync(command.Payload, command.UpdatedAt, cancellationToken);
}

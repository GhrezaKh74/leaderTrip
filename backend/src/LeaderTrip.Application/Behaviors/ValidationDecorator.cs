using FluentValidation;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;

namespace LeaderTrip.Application.Behaviors;

/// <summary>اعتبارسنجی ورودی، پیش از رسیدن به مسئول اصلی.</summary>
/// <remarks>
/// الگوی Decorator: مسئول اصلی نمی‌داند اعتبارسنجی وجود دارد و کدش دست‌نخورده
/// می‌ماند — همان اصل باز/بسته. جایگزین این کار، تکرار چند خط اعتبارسنجی در
/// ابتدای هر مسئول است که هیچ‌کس یادش نمی‌ماند.
/// </remarks>
public sealed class ValidationDecorator<TQuery, TResponse> : IQueryHandler<TQuery, TResponse>
    where TQuery : IQuery<TResponse>
{
    private readonly IQueryHandler<TQuery, TResponse> _inner;
    private readonly IValidator<TQuery>? _validator;

    public ValidationDecorator(IQueryHandler<TQuery, TResponse> inner, IValidator<TQuery>? validator = null)
    {
        _inner = inner;
        _validator = validator;
    }

    public async Task<Result<TResponse>> HandleAsync(TQuery query, CancellationToken cancellationToken)
    {
        if (_validator is null)
        {
            return await _inner.HandleAsync(query, cancellationToken).ConfigureAwait(false);
        }

        var validation = await _validator.ValidateAsync(query, cancellationToken).ConfigureAwait(false);
        if (validation.IsValid)
        {
            return await _inner.HandleAsync(query, cancellationToken).ConfigureAwait(false);
        }

        var first = validation.Errors[0];
        return Result.Failure<TResponse>(
            DomainError.Validation($"validation.{first.PropertyName}", first.ErrorMessage));
    }
}

/// <summary>همان تزئین‌گر، برای فرمان‌ها.</summary>
/// <remarks>
/// تکرار عمدی و کوچک است: <c>IQuery</c> و <c>ICommand</c> دو اینترفیس جدا هستند
/// (که خودِ نکتهٔ CQRS است) و C# اجازه نمی‌دهد یک کلاس جنریک هر دو را با یک قید
/// بپوشاند. راه دیگر، یکی‌کردن آن دو اینترفیس بود — یعنی خراب‌کردن تفکیکی که
/// همین‌جا ارزشش را دارد.
/// </remarks>
public sealed class CommandValidationDecorator<TCommand, TResponse> : ICommandHandler<TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{
    private readonly ICommandHandler<TCommand, TResponse> _inner;
    private readonly IValidator<TCommand>? _validator;

    public CommandValidationDecorator(
        ICommandHandler<TCommand, TResponse> inner,
        IValidator<TCommand>? validator = null)
    {
        _inner = inner;
        _validator = validator;
    }

    public async Task<Result<TResponse>> HandleAsync(TCommand command, CancellationToken cancellationToken)
    {
        if (_validator is null)
        {
            return await _inner.HandleAsync(command, cancellationToken).ConfigureAwait(false);
        }

        var validation = await _validator.ValidateAsync(command, cancellationToken).ConfigureAwait(false);

        if (validation.IsValid)
        {
            return await _inner.HandleAsync(command, cancellationToken).ConfigureAwait(false);
        }

        var first = validation.Errors[0];

        return Result.Failure<TResponse>(
            DomainError.Validation($"validation.{first.PropertyName}", first.ErrorMessage));
    }
}

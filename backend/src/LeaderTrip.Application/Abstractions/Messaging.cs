using LeaderTrip.Domain.Common;

namespace LeaderTrip.Application.Abstractions;

/// <summary>پرسشی که چیزی را تغییر نمی‌دهد.</summary>
public interface IQuery<TResponse>;

/// <summary>فرمانی که وضعیت را تغییر می‌دهد.</summary>
public interface ICommand<TResponse>;

public interface IQueryHandler<in TQuery, TResponse>
    where TQuery : IQuery<TResponse>
{
    Task<Result<TResponse>> HandleAsync(TQuery query, CancellationToken cancellationToken);
}

public interface ICommandHandler<in TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{
    Task<Result<TResponse>> HandleAsync(TCommand command, CancellationToken cancellationToken);
}

/// <summary>ارسال پرسش و فرمان به مسئولشان.</summary>
/// <remarks>
/// <para>
/// چرا دست‌نویس و نه MediatR: از نسخهٔ ۱۲ تجاری شده است. این انتزاع چند ده خط
/// است، وابستگی و ریسک مجوز ندارد، و الگو را واضح‌تر نشان می‌دهد.
/// </para>
/// <para>
/// چرا اصلاً CQRS: خواندن و نوشتن نیازهای متفاوتی دارند — یکی بهینه‌سازی
/// نمایش می‌خواهد و دیگری تضمین ثبات. سرویس واحدی که هر دو را بدهد، همیشه
/// به یکی از دو طرف بدهکار می‌ماند.
/// </para>
/// </remarks>
public interface IDispatcher
{
    Task<Result<TResponse>> QueryAsync<TResponse>(
        IQuery<TResponse> query,
        CancellationToken cancellationToken = default);

    Task<Result<TResponse>> SendAsync<TResponse>(
        ICommand<TResponse> command,
        CancellationToken cancellationToken = default);
}

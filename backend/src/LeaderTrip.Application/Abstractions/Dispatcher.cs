using LeaderTrip.Domain.Common;
using Microsoft.Extensions.DependencyInjection;

namespace LeaderTrip.Application.Abstractions;

/// <summary>پیاده‌سازی <see cref="IDispatcher"/> روی ظرف تزریق وابستگی.</summary>
internal sealed class Dispatcher : IDispatcher
{
    private readonly IServiceProvider _services;

    public Dispatcher(IServiceProvider services) => _services = services;

    public Task<Result<TResponse>> QueryAsync<TResponse>(
        IQuery<TResponse> query,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);

        var handlerType = typeof(IQueryHandler<,>).MakeGenericType(query.GetType(), typeof(TResponse));
        dynamic handler = _services.GetRequiredService(handlerType);

        return handler.HandleAsync((dynamic)query, cancellationToken);
    }

    public Task<Result<TResponse>> SendAsync<TResponse>(
        ICommand<TResponse> command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);

        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(command.GetType(), typeof(TResponse));
        dynamic handler = _services.GetRequiredService(handlerType);

        return handler.HandleAsync((dynamic)command, cancellationToken);
    }
}

using LeaderTrip.Domain.Routing;
using LeaderTrip.Domain.ValueObjects;
using LeaderTrip.Infrastructure.External;
using LeaderTrip.Infrastructure.External.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.Tests;

public sealed class CachingRoadDistanceProviderTests
{
    private static readonly Coordinate Tehran = Coordinate.Create(35.6892, 51.389).Value;
    private static readonly Coordinate Isfahan = Coordinate.Create(32.6539, 51.666).Value;

    [Fact]
    public void SecondLookup_OfTheSamePair_DoesNotReachTheInnerProvider()
    {
        var inner = new CountingProvider(new RoadMeasurement(Distance.FromKilometers(440), TimeSpan.FromHours(5)));
        var provider = Build(inner);

        var first = provider.TryGet(Tehran, Isfahan);
        var second = provider.TryGet(Tehran, Isfahan);

        Assert.Equal(first, second);
        Assert.Equal(1, inner.Calls);
    }

    /// <summary>
    /// «پیدا نشد» معمولاً یعنی سرویس در آن لحظه در دسترس نبود. کش‌کردنش یعنی یک
    /// خرابی چند ثانیه‌ای را ساعت‌ها ماندگار کنیم و هر برنامهٔ بعدی بی‌دلیل تخمینی
    /// بماند.
    /// </summary>
    [Fact]
    public void Misses_AreNotCached()
    {
        var inner = new CountingProvider(null);
        var provider = Build(inner);

        Assert.Null(provider.TryGet(Tehran, Isfahan));
        Assert.Null(provider.TryGet(Tehran, Isfahan));

        Assert.Equal(2, inner.Calls);
    }

    [Fact]
    public void DifferentPairs_AreCachedSeparately()
    {
        var inner = new CountingProvider(new RoadMeasurement(Distance.FromKilometers(440), TimeSpan.FromHours(5)));
        var provider = Build(inner);

        provider.TryGet(Tehran, Isfahan);
        provider.TryGet(Isfahan, Tehran);

        // جهت مسیر بخشی از کلید است: در جادهٔ یک‌طرفه یا با ترافیک نامتقارن،
        // رفت و برگشت یکی نیستند.
        Assert.Equal(2, inner.Calls);
    }

    private static CachingRoadDistanceProvider Build(IRoadDistanceProvider inner) =>
        new(
            inner,
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new RoutingOptions()));

    private sealed class CountingProvider : IRoadDistanceProvider
    {
        private readonly RoadMeasurement? _answer;

        public CountingProvider(RoadMeasurement? answer) => _answer = answer;

        public int Calls { get; private set; }

        public RoadMeasurement? TryGet(Coordinate origin, Coordinate destination)
        {
            Calls++;

            return _answer;
        }
    }
}

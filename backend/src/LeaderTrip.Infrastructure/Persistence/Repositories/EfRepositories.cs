using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;
using LeaderTrip.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;

namespace LeaderTrip.Infrastructure.Persistence.Repositories;

/// <summary>آداپتر EF Core برای شهرها.</summary>
/// <remarks>
/// همهٔ کوئری‌ها <c>AsNoTracking</c>اند: این داده مرجع است و از این مسیر هرگز
/// نوشته نمی‌شود، پس هزینهٔ ردیابی تغییرات بی‌فایده است.
/// </remarks>
internal sealed class EfCityRepository : ICityRepository
{
    private readonly LeaderTripDbContext _db;

    public EfCityRepository(LeaderTripDbContext db) => _db = db;

    public async Task<IReadOnlyList<City>> GetAllAsync(CancellationToken cancellationToken)
    {
        var rows = await _db.Cities.AsNoTracking().ToListAsync(cancellationToken).ConfigureAwait(false);

        return rows.ConvertAll(RowMapper.ToDomain);
    }

    public async Task<City?> FindAsync(string id, CancellationToken cancellationToken)
    {
        var row = await _db.Cities.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            .ConfigureAwait(false);

        return row is null ? null : RowMapper.ToDomain(row);
    }
}

internal sealed class EfPoiRepository : IPoiRepository
{
    private readonly LeaderTripDbContext _db;

    public EfPoiRepository(LeaderTripDbContext db) => _db = db;

    public async Task<IReadOnlyList<PointOfInterest>> GetAllAsync(CancellationToken cancellationToken)
    {
        var rows = await _db.PointsOfInterest.AsNoTracking().ToListAsync(cancellationToken).ConfigureAwait(false);

        return rows.ConvertAll(RowMapper.ToDomain);
    }
}

internal sealed class EfVehicleRepository : IVehicleRepository
{
    private readonly LeaderTripDbContext _db;

    public EfVehicleRepository(LeaderTripDbContext db) => _db = db;

    public async Task<IReadOnlyList<Vehicle>> GetAllAsync(CancellationToken cancellationToken)
    {
        var rows = await _db.Vehicles.AsNoTracking().ToListAsync(cancellationToken).ConfigureAwait(false);

        return rows.ConvertAll(RowMapper.ToDomain);
    }

    public async Task<Vehicle?> FindAsync(string id, CancellationToken cancellationToken)
    {
        var row = await _db.Vehicles.AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken)
            .ConfigureAwait(false);

        return row is null ? null : RowMapper.ToDomain(row);
    }
}

/// <summary>جدیدترین دفترچهٔ قیمت از پایگاه داده.</summary>
/// <remarks>
/// اگر جدول خالی بود به دفترچهٔ همراه برنامه برمی‌گردد. این «پنهان‌کردن خطا»
/// نیست: نبودِ قیمتِ به‌روزتر یعنی قیمت پیش‌فرض معتبر است، نه اینکه برنامه
/// نتواند ساخته شود.
/// </remarks>
internal sealed class EfPriceBookProvider : IPriceBookProvider
{
    private readonly LeaderTripDbContext _db;

    public EfPriceBookProvider(LeaderTripDbContext db) => _db = db;

    public async Task<PriceBook> GetCurrentAsync(CancellationToken cancellationToken)
    {
        string? payload = await _db.PriceBooks.AsNoTracking()
            .OrderByDescending(p => p.EffectiveFrom)
            .Select(p => p.Payload)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        return payload is null
            ? SeedCatalog.Instance.PriceBook
            : SeedCatalog.ParsePriceBook(payload);
    }
}

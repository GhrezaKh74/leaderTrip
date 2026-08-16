using Microsoft.EntityFrameworkCore;

namespace LeaderTrip.Infrastructure.Persistence;

/// <summary>بافت پایگاه دادهٔ دادهٔ مرجع.</summary>
/// <remarks>
/// <para>
/// جدول‌ها به <see cref="CityRow"/> و همتاهایش نگاشت می‌شوند، نه به موجودیت‌های
/// دامنه. یعنی <c>LeaderTrip.Domain</c> هیچ ارجاعی به EF Core ندارد و هیچ امتیازی
/// هم به آن نمی‌دهد — نه سازندهٔ بی‌پارامتر، نه ستر خصوصی، نه خاصیت ناوبری.
/// </para>
/// <para>
/// تبدیل ردیف به موجودیت در <see cref="RowMapper"/> است و مخزن‌ها آن را صدا
/// می‌زنند. بهایش یک نگاشت چند خطی است؛ سودش این است که تست‌های دامنه بدون هیچ
/// بستهٔ داده‌ای اجرا می‌شوند و عوض‌کردن پایگاه داده به دامنه دست نمی‌زند.
/// </para>
/// </remarks>
public sealed class LeaderTripDbContext : DbContext
{
    public LeaderTripDbContext(DbContextOptions<LeaderTripDbContext> options)
        : base(options)
    {
    }

    internal DbSet<CityRow> Cities => Set<CityRow>();

    internal DbSet<PoiRow> PointsOfInterest => Set<PoiRow>();

    internal DbSet<VehicleRow> Vehicles => Set<VehicleRow>();

    internal DbSet<PriceBookRow> PriceBooks => Set<PriceBookRow>();

    internal DbSet<UserRow> Users => Set<UserRow>();

    internal DbSet<SessionRow> Sessions => Set<SessionRow>();

    internal DbSet<SavedTripRow> SavedTrips => Set<SavedTripRow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LeaderTripDbContext).Assembly);
    }
}

using LeaderTrip.Domain.Entities;
using LeaderTrip.Domain.Pricing;

namespace LeaderTrip.Application.Abstractions;

/// <summary>دسترسی به شهرها.</summary>
/// <remarks>
/// پورت‌ها عمداً باریک‌اند. یک <c>IDataAccess</c> چاق یعنی هر مصرف‌کننده به
/// چیزهایی وابسته می‌شود که لازم ندارد — نقض اصل تفکیک اینترفیس، و در عمل
/// یعنی تست‌هایی که باید ده متد بی‌ربط را جعل کنند.
/// </remarks>
public interface ICityRepository
{
    Task<IReadOnlyList<City>> GetAllAsync(CancellationToken cancellationToken);

    Task<City?> FindAsync(string id, CancellationToken cancellationToken);
}

public interface IPoiRepository
{
    Task<IReadOnlyList<PointOfInterest>> GetAllAsync(CancellationToken cancellationToken);
}

public interface IVehicleRepository
{
    Task<IReadOnlyList<Vehicle>> GetAllAsync(CancellationToken cancellationToken);

    Task<Vehicle?> FindAsync(string id, CancellationToken cancellationToken);
}

/// <summary>قیمت‌های پایهٔ جاری.</summary>
/// <remarks>
/// جدا از مخزن‌هاست چون منبعش می‌تواند فرق کند: پایگاه داده، فایل پیکربندی،
/// یا یک سرویس بیرونی. مصرف‌کننده نباید بداند کدام.
/// </remarks>
public interface IPriceBookProvider
{
    Task<PriceBook> GetCurrentAsync(CancellationToken cancellationToken);
}

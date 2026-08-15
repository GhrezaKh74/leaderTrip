using System.Text.Json;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Application.Prices.UpdatePriceBook;
using LeaderTrip.Domain.Common;
using LeaderTrip.Infrastructure.Seed;

namespace LeaderTrip.Infrastructure.Persistence.Repositories;

/// <summary>انتشار نسخهٔ تازهٔ دفترچهٔ قیمت در پایگاه داده.</summary>
/// <remarks>
/// نسخهٔ قبلی بازنویسی نمی‌شود؛ ردیف تازه اضافه می‌شود و آخرین
/// <c>EffectiveFrom</c> برنده است. یعنی برگشتن به قیمت‌های قبل یک درج دیگر است،
/// نه بازیابی از پشتیبان.
/// </remarks>
internal sealed class EfPriceBookWriter : IPriceBookWriter
{
    private readonly LeaderTripDbContext _db;
    private readonly TimeProvider _clock;

    public EfPriceBookWriter(LeaderTripDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<Result<PriceBookVersionResponse>> PublishAsync(
        string payload,
        string updatedAt,
        CancellationToken cancellationToken)
    {
        // محتوا همین‌جا خوانده می‌شود تا مطمئن شویم قابل خواندن است. ذخیره‌کردن
        // JSONای که فردا هنگام ساخت برنامه می‌ترکد، خطا را از لحظهٔ ویرایش به
        // لحظه‌ای منتقل می‌کند که هیچ‌کس نمی‌داند چه چیزی عوض شده بود.
        string stamped;

        try
        {
            var parsed = JsonSerializer.Deserialize<PriceBookContent>(payload, SeedCatalog.SerializerOptions)
                ?? throw new JsonException("محتوای خالی.");

            stamped = JsonSerializer.Serialize(parsed with { UpdatedAt = updatedAt }, SeedCatalog.SerializerOptions);

            // خواندن دوباره از متن نهایی: اگر نگاشت به دامنه شکست بخورد، همین حالا
            // معلوم شود نه هنگام اولین درخواست برنامه‌ریزی.
            _ = SeedCatalog.ParsePriceBook(stamped);
        }
        catch (JsonException ex)
        {
            return Result.Failure<PriceBookVersionResponse>(DomainError.Validation(
                "priceBook.invalidJson",
                $"محتوای دفترچهٔ قیمت قابل خواندن نیست: {ex.Message}"));
        }
        catch (KeyNotFoundException)
        {
            return Result.Failure<PriceBookVersionResponse>(DomainError.Validation(
                "priceBook.incomplete",
                "دفترچهٔ قیمت ناقص است: همهٔ سطح‌های سفر و انواع سوخت باید قیمت داشته باشند."));
        }

        var row = new PriceBookRow(0, stamped, _clock.GetUtcNow());

        _db.PriceBooks.Add(row);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new PriceBookVersionResponse(row.Id, row.EffectiveFrom, updatedAt);
    }
}

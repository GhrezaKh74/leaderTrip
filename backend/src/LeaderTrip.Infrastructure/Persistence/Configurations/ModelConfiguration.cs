using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LeaderTrip.Infrastructure.Persistence.Configurations;

/// <summary>مبدل‌های مشترک بین نگاشت‌ها.</summary>
internal static class Converters
{
    /// <summary>ماه‌های مناسب ↔ آرایهٔ عددی Postgres.</summary>
    /// <remarks>
    /// مقایسه‌گر اختیاری نیست: بدون آن EF تغییر محتوای مجموعه را نمی‌بیند و
    /// ویرایش ماه‌های یک جاذبه بی‌صدا ذخیره نمی‌شود.
    /// </remarks>
    public static readonly ValueConverter<IReadOnlyList<int>, int[]> IntList =
        new(list => list.ToArray(), array => array.ToList());

    public static readonly ValueComparer<IReadOnlyList<int>> IntListComparer =
        new(
            (left, right) => left != null && right != null && left.SequenceEqual(right),
            list => list.Aggregate(0, (hash, item) => HashCode.Combine(hash, item)),
            list => list.ToList());

    public static readonly ValueConverter<IReadOnlyList<string>, string[]> StringList =
        new(list => list.ToArray(), array => array.ToList());

    public static readonly ValueComparer<IReadOnlyList<string>> StringListComparer =
        new(
            (left, right) => left != null && right != null && left.SequenceEqual(right),
            list => list.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode(StringComparison.Ordinal))),
            list => list.ToList());
}

internal sealed class CityConfiguration : IEntityTypeConfiguration<CityRow>
{
    public void Configure(EntityTypeBuilder<CityRow> builder)
    {
        builder.ToTable("cities");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasMaxLength(64);
        builder.Property(c => c.Name).HasMaxLength(128);
        builder.Property(c => c.Province).HasMaxLength(64);
        builder.Property(c => c.CostIndex).HasPrecision(4, 2);

        // شمارشی‌ها به‌صورت متن ذخیره می‌شوند نه عدد. یک ستون با مقدار «۳» به
        // کسی که جدول را باز می‌کند هیچ نمی‌گوید، و بدتر: اگر روزی ترتیب مقادیر
        // در enum عوض شود، دادهٔ قدیمی بی‌صدا معنایش را از دست می‌دهد.
        builder.Property(c => c.Climate).HasConversion<string>().HasMaxLength(32);

        builder.HasIndex(c => c.Province);
    }
}

internal sealed class PoiConfiguration : IEntityTypeConfiguration<PoiRow>
{
    public void Configure(EntityTypeBuilder<PoiRow> builder)
    {
        builder.ToTable("pois");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasMaxLength(64);
        builder.Property(p => p.Name).HasMaxLength(160);
        builder.Property(p => p.CityId).HasMaxLength(64);
        builder.Property(p => p.Description).HasMaxLength(1024);

        // پول با numeric ذخیره می‌شود نه شناور: خطای گردکردنِ انباشته در گزارشی
        // که ادعا می‌کند «هر ریال قابل ردیابی است» جایی ندارد.
        builder.Property(p => p.Ticket).HasPrecision(14, 0);

        builder.Property(p => p.Category).HasConversion<string>().HasMaxLength(32);
        builder.Property(p => p.Difficulty).HasConversion<string>().HasMaxLength(32);
        builder.Property(p => p.RequiredVehicle).HasConversion<string>().HasMaxLength(32);

        builder.Property(p => p.BestMonths)
            .HasConversion(Converters.IntList, Converters.IntListComparer)
            .HasColumnType("integer[]");

        builder.Property(p => p.Tags)
            .HasConversion(Converters.StringList, Converters.StringListComparer)
            .HasColumnType("text[]");

        // کلید خارجی بدون خاصیت ناوبری: یکپارچگی را پایگاه داده تضمین می‌کند،
        // ولی ردیف جاذبه مجبور نیست گراف شهر را با خودش حمل کند.
        builder.HasOne<CityRow>()
            .WithMany()
            .HasForeignKey(p => p.CityId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.Category);
        builder.HasIndex(p => p.CityId);
    }
}

internal sealed class VehicleConfiguration : IEntityTypeConfiguration<VehicleRow>
{
    public void Configure(EntityTypeBuilder<VehicleRow> builder)
    {
        builder.ToTable("vehicles");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasMaxLength(64);
        builder.Property(v => v.Label).HasMaxLength(160);
        builder.Property(v => v.Class).HasConversion<string>().HasMaxLength(32);
        builder.Property(v => v.Fuel).HasConversion<string>().HasMaxLength(32);
        builder.Property(v => v.Offroad).HasConversion<string>().HasMaxLength(32);
        builder.Property(v => v.DepreciationPerKm).HasPrecision(10, 2);
        builder.Property(v => v.TollFactor).HasPrecision(4, 2);
    }
}

internal sealed class PriceBookConfiguration : IEntityTypeConfiguration<PriceBookRow>
{
    public void Configure(EntityTypeBuilder<PriceBookRow> builder)
    {
        builder.ToTable("price_books");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedOnAdd();
        builder.Property(p => p.Payload).HasColumnType("jsonb");
        builder.HasIndex(p => p.EffectiveFrom);
    }
}

internal sealed class UserConfiguration : IEntityTypeConfiguration<UserRow>
{
    public void Configure(EntityTypeBuilder<UserRow> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasMaxLength(254);
        builder.Property(u => u.DisplayName).HasMaxLength(60);
        builder.Property(u => u.PasswordHash).HasMaxLength(512);

        // یکتایی ایمیل را پایگاه داده تضمین می‌کند، نه فقط کد: دو ثبت‌نام
        // هم‌زمان با یک ایمیل، یکی‌شان به این ایندکس می‌خورد.
        builder.HasIndex(u => u.Email).IsUnique();
    }
}

internal sealed class SessionConfiguration : IEntityTypeConfiguration<SessionRow>
{
    public void Configure(EntityTypeBuilder<SessionRow> builder)
    {
        builder.ToTable("auth_sessions");
        builder.HasKey(s => s.TokenHash);
        builder.Property(s => s.TokenHash).HasMaxLength(64);
        builder.HasIndex(s => s.UserId);
        builder.HasIndex(s => s.ExpiresAt);
    }
}

internal sealed class SavedTripConfiguration : IEntityTypeConfiguration<SavedTripRow>
{
    public void Configure(EntityTypeBuilder<SavedTripRow> builder)
    {
        builder.ToTable("saved_trips");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Title).HasMaxLength(120);
        builder.Property(t => t.Payload).HasColumnType("jsonb");
        builder.HasIndex(t => t.UserId);
    }
}

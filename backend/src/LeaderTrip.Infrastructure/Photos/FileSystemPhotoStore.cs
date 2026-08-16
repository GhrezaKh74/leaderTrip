using System.Globalization;
using System.Security.Cryptography;
using LeaderTrip.Application.Abstractions;
using LeaderTrip.Domain.Common;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.Photos;

/// <summary>ذخیرهٔ عکس روی فایل‌سیستم.</summary>
/// <remarks>
/// <para>
/// پایگاه داده برای بایت‌های عکس جای اشتباهی است: بکاپ را سنگین می‌کند، کش HTTP
/// را دور می‌زند و هیچ پرسشی روی محتوایش نمی‌زنیم. فایل‌سیستم + volume داکر همان
/// چیزی است که لازم است — و اگر روزی S3 لازم شد، فقط همین کلاس عوض می‌شود.
/// </para>
/// <para>
/// <b>به هیچ ورودی کلاینت اعتماد نمی‌شود:</b> نام فایل تولید می‌شود (نه نام
/// کلاینت)، نوع از امضای باینری خود فایل درمی‌آید (نه از Content-Type)، و
/// شناسهٔ درخواستی هنگام خواندن با الگوی سخت‌گیرانه سنجیده می‌شود تا
/// <c>../</c> راه به جایی نبرد.
/// </para>
/// </remarks>
public sealed class FileSystemPhotoStore : IPhotoStore
{
    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.Ordinal)
    {
        ["jpg"] = "image/jpeg",
        ["png"] = "image/png",
        ["webp"] = "image/webp",
    };

    private readonly string _root;
    private readonly long _maxBytes;

    public FileSystemPhotoStore(IOptions<PhotoOptions> options)
    {
        ArgumentNullException.ThrowIfNull(options);

        _root = Path.GetFullPath(options.Value.RootPath);
        _maxBytes = options.Value.MaxBytes;

        Directory.CreateDirectory(_root);
    }

    public async Task<Result<StoredPhoto>> SaveAsync(
        Stream content,
        long declaredLength,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(content);

        if (declaredLength <= 0)
        {
            return Result.Failure<StoredPhoto>(DomainError.Validation(
                "photo.empty", "فایلی دریافت نشد."));
        }

        if (declaredLength > _maxBytes)
        {
            return Result.Failure<StoredPhoto>(DomainError.Validation(
                "photo.tooLarge",
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"حجم عکس بیشتر از سقف {_maxBytes / 1_000_000.0:0.#} مگابایت است.")));
        }

        // امضای باینری در ۱۲ بایت اول است؛ هدر HTTP را اصلاً نگاه نمی‌کنیم.
        var header = new byte[12];
        int read = await ReadUpToAsync(content, header, cancellationToken).ConfigureAwait(false);
        string? extension = SniffExtension(header.AsSpan(0, read));

        if (extension is null)
        {
            return Result.Failure<StoredPhoto>(DomainError.Validation(
                "photo.unsupportedType", "فقط JPEG، PNG و WebP پذیرفته می‌شود."));
        }

        string id = $"{Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(16))}.{extension}";
        string finalPath = Path.Combine(_root, id);
        string tempPath = finalPath + ".tmp";

        try
        {
            var stream = new FileStream(
                tempPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 64 * 1024, useAsync: true);

            await using (stream.ConfigureAwait(false))
            {
                await stream.WriteAsync(header.AsMemory(0, read), cancellationToken).ConfigureAwait(false);

                // اندازهٔ اعلام‌شده ادعای کلاینت است؛ هنگام نوشتن هم شمرده می‌شود
                // تا کلاینتی که دروغ گفته از سقف رد نشود.
                long total = read;
                var buffer = new byte[64 * 1024];
                int chunk;

                while ((chunk = await ReadUpToAsync(content, buffer, cancellationToken).ConfigureAwait(false)) > 0)
                {
                    total += chunk;

                    if (total > _maxBytes)
                    {
                        return Result.Failure<StoredPhoto>(DomainError.Validation(
                            "photo.tooLarge", "حجم واقعی عکس بیشتر از سقف مجاز است."));
                    }

                    await stream.WriteAsync(buffer.AsMemory(0, chunk), cancellationToken).ConfigureAwait(false);
                }
            }

            // نوشتن اتمی: یا فایل کامل سر جایش می‌نشیند یا اصلاً نمی‌نشیند.
            // فایل نیمه‌نوشته با نام نهایی یعنی عکسی که باز می‌شود ولی خراب است.
            File.Move(tempPath, finalPath);

            return Result.Success(new StoredPhoto(id));
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    public Task<PhotoContent?> OpenAsync(string id, CancellationToken cancellationToken)
    {
        // شناسهٔ معتبر فقط همان شکلی است که خودمان ساخته‌ایم؛ هرچیز دیگر —
        // از جمله هر تلاشی برای پیمایش مسیر — همین‌جا «وجود ندارد» می‌شود.
        string? extension = ParseId(id);

        if (extension is null)
        {
            return Task.FromResult<PhotoContent?>(null);
        }

        string path = Path.Combine(_root, id);

        if (!File.Exists(path))
        {
            return Task.FromResult<PhotoContent?>(null);
        }

        var stream = new FileStream(
            path, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true);

        return Task.FromResult<PhotoContent?>(
            new PhotoContent(stream, ContentTypes[extension], stream.Length));
    }

    public Task<PhotoInventory> ListAsync(int skip, int take, CancellationToken cancellationToken)
    {
        // فقط فایل‌هایی که خودمان ساخته‌ایم؛ فایل غریبه در پوشه (مثلاً .tmp
        // جامانده از یک کرش) نه شمرده می‌شود نه نشان داده می‌شود.
        var all = new DirectoryInfo(_root)
            .EnumerateFiles()
            .Where(file => ParseId(file.Name) is not null)
            .OrderByDescending(file => file.CreationTimeUtc)
            .ToList();

        var items = all
            .Skip(Math.Max(0, skip))
            .Take(Math.Clamp(take, 1, 200))
            .Select(file => new StoredPhotoInfo(file.Name, file.Length, file.CreationTimeUtc))
            .ToList();

        return Task.FromResult(new PhotoInventory(items, all.Count, all.Sum(file => file.Length)));
    }

    public Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        if (ParseId(id) is null)
        {
            return Task.FromResult(false);
        }

        string path = Path.Combine(_root, id);

        if (!File.Exists(path))
        {
            return Task.FromResult(false);
        }

        File.Delete(path);

        return Task.FromResult(true);
    }

    /// <summary>خواندن تا پرشدن بافر یا تمام‌شدن جریان — <c>ReadAsync</c> می‌تواند کمتر بدهد.</summary>
    private static async Task<int> ReadUpToAsync(Stream source, byte[] buffer, CancellationToken cancellationToken)
    {
        int total = 0;

        while (total < buffer.Length)
        {
            int read = await source
                .ReadAsync(buffer.AsMemory(total, buffer.Length - total), cancellationToken)
                .ConfigureAwait(false);

            if (read == 0)
            {
                break;
            }

            total += read;
        }

        return total;
    }

    private static string? SniffExtension(ReadOnlySpan<byte> header)
    {
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return "jpg";
        }

        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

        if (header.Length >= 8 && header[..8].SequenceEqual(png))
        {
            return "png";
        }

        // WebP: RIFF ....(اندازه) WEBP
        if (header.Length >= 12
            && header[..4].SequenceEqual("RIFF"u8)
            && header[8..12].SequenceEqual("WEBP"u8))
        {
            return "webp";
        }

        return null;
    }

    /// <summary>اگر شناسه دقیقاً «۳۲ رقم شانزدهی + پسوند شناخته‌شده» بود، پسوند را می‌دهد.</summary>
    private static string? ParseId(string id)
    {
        if (string.IsNullOrEmpty(id))
        {
            return null;
        }

        int dot = id.IndexOf('.', StringComparison.Ordinal);

        if (dot != 32)
        {
            return null;
        }

        foreach (char c in id.AsSpan(0, 32))
        {
            bool hex = c is (>= '0' and <= '9') or (>= 'a' and <= 'f');

            if (!hex)
            {
                return null;
            }
        }

        string extension = id[(dot + 1)..];

        return ContentTypes.ContainsKey(extension) ? extension : null;
    }
}

using LeaderTrip.Infrastructure.Photos;
using Microsoft.Extensions.Options;

namespace LeaderTrip.Infrastructure.Tests;

public sealed class FileSystemPhotoStoreTests : IDisposable
{
    private static readonly byte[] JpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];
    private static readonly byte[] PngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];

    private readonly string _root = Path.Combine(Path.GetTempPath(), $"leadertrip-photos-{Guid.NewGuid():N}");

    private FileSystemPhotoStore Build(long maxBytes = 1_000_000) =>
        new(Options.Create(new PhotoOptions { RootPath = _root, MaxBytes = maxBytes }));

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task SavedJpeg_CanBeOpenedBack_WithSameBytesAndContentType()
    {
        var store = Build();
        byte[] payload = [.. JpegHeader, .. new byte[500]];

        var saved = await store.SaveAsync(new MemoryStream(payload), payload.Length, CancellationToken.None);

        Assert.True(saved.IsSuccess);
        Assert.EndsWith(".jpg", saved.Value.Id, StringComparison.Ordinal);

        var opened = await store.OpenAsync(saved.Value.Id, CancellationToken.None);

        Assert.NotNull(opened);
        Assert.Equal("image/jpeg", opened.ContentType);

        await using var content = opened.Content;
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, CancellationToken.None);

        Assert.Equal(payload, copy.ToArray());
    }

    [Fact]
    public async Task PngSignature_GetsPngExtension()
    {
        var store = Build();
        byte[] payload = [.. PngHeader, .. new byte[100]];

        var saved = await store.SaveAsync(new MemoryStream(payload), payload.Length, CancellationToken.None);

        Assert.True(saved.IsSuccess);
        Assert.EndsWith(".png", saved.Value.Id, StringComparison.Ordinal);
    }

    /// <summary>
    /// نوع فایل از امضای باینری می‌آید، نه از ادعای کلاینت: یک فایل متنی با هر
    /// Content-Type ای که بیاید باید رد شود.
    /// </summary>
    [Fact]
    public async Task NonImagePayload_IsRejected()
    {
        var store = Build();
        byte[] payload = "<script>alert(1)</script> not an image at all"u8.ToArray();

        var saved = await store.SaveAsync(new MemoryStream(payload), payload.Length, CancellationToken.None);

        Assert.True(saved.IsFailure);
        Assert.Equal("photo.unsupportedType", saved.Error.Code);
    }

    [Fact]
    public async Task DeclaredLengthOverCap_IsRejected()
    {
        var store = Build(maxBytes: 1_000_000);

        var saved = await store.SaveAsync(new MemoryStream(JpegHeader), 2_000_000, CancellationToken.None);

        Assert.True(saved.IsFailure);
        Assert.Equal("photo.tooLarge", saved.Error.Code);
    }

    /// <summary>اندازهٔ اعلام‌شده ادعاست؛ جریانی که بیشتر می‌فرستد وسط نوشتن رد می‌شود.</summary>
    [Fact]
    public async Task StreamLargerThanDeclared_IsRejectedAndLeavesNoFile()
    {
        var store = Build(maxBytes: 1_000_000);
        byte[] payload = [.. JpegHeader, .. new byte[2_000_000]];

        var saved = await store.SaveAsync(new MemoryStream(payload), 500, CancellationToken.None);

        Assert.True(saved.IsFailure);
        Assert.Equal("photo.tooLarge", saved.Error.Code);
        Assert.Empty(Directory.GetFiles(_root));
    }

    /// <summary>هر شناسهٔ خارج از الگوی خودمان — از جمله پیمایش مسیر — «وجود ندارد» است.</summary>
    [Theory]
    [InlineData("../../etc/passwd")]
    [InlineData("..%2f..%2fetc%2fpasswd")]
    [InlineData("abc.jpg")]
    [InlineData("ffffffffffffffffffffffffffffffff.exe")]
    [InlineData("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF.jpg")]
    [InlineData("")]
    public async Task MalformedIds_AreNotFound(string id)
    {
        var store = Build();

        Assert.Null(await store.OpenAsync(id, CancellationToken.None));
    }
}

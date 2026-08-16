using System.Net;
using System.Net.Http.Json;

namespace LeaderTrip.Api.Tests;

public sealed class PhotoEndpointTests : IClassFixture<ApiFactory>
{
    private static readonly byte[] JpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];

    private readonly ApiFactory _factory;

    public PhotoEndpointTests(ApiFactory factory) => _factory = factory;

    private sealed record UploadResponse(string Id, string Url);

    private static MultipartFormDataContent Form(byte[] payload, string contentType = "image/jpeg")
    {
        var file = new ByteArrayContent(payload);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);

        return new MultipartFormDataContent { { file, "photo", "checkin.jpg" } };
    }

    [Fact]
    public async Task UploadedJpeg_ComesBackByteForByte_FromItsUrl()
    {
        using var client = _factory.CreateClient();
        byte[] payload = [.. JpegHeader, .. new byte[900]];

        using var form = Form(payload);
        var upload = await client.PostAsync(new Uri("/api/photos", UriKind.Relative), form);

        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);

        var body = await upload.Content.ReadFromJsonAsync<UploadResponse>();

        Assert.NotNull(body);
        Assert.Equal($"/api/photos/{body.Id}", body.Url);

        var fetched = await client.GetAsync(new Uri(body.Url, UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, fetched.StatusCode);
        Assert.Equal("image/jpeg", fetched.Content.Headers.ContentType?.MediaType);
        Assert.Equal(payload, await fetched.Content.ReadAsByteArrayAsync());

        // شناسه تصادفی و تغییرناپذیر است؛ پاسخ باید برای کش بی‌قیدوشرط علامت خورده باشد.
        Assert.Contains("immutable", fetched.Headers.CacheControl?.ToString(), StringComparison.Ordinal);
    }

    /// <summary>Content-Type دروغین کمکی نمی‌کند: امضای باینری تصمیم می‌گیرد.</summary>
    [Fact]
    public async Task TextPayload_ClaimingToBeJpeg_IsRejected()
    {
        using var client = _factory.CreateClient();

        using var form = Form("this is not an image, whatever the header says"u8.ToArray());
        var upload = await client.PostAsync(new Uri("/api/photos", UriKind.Relative), form);

        Assert.Equal(HttpStatusCode.BadRequest, upload.StatusCode);
        Assert.Contains("photo.unsupportedType", await upload.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PayloadOverConfiguredCap_IsRejected()
    {
        using var client = _factory.CreateClient();
        byte[] payload = [.. JpegHeader, .. new byte[70_000]];

        using var form = Form(payload);
        var upload = await client.PostAsync(new Uri("/api/photos", UriKind.Relative), form);

        Assert.Equal(HttpStatusCode.BadRequest, upload.StatusCode);
        Assert.Contains("photo.tooLarge", await upload.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task MissingFile_IsABadRequest_NotAServerError()
    {
        using var client = _factory.CreateClient();

        using var form = new MultipartFormDataContent { { new ByteArrayContent([1]), "somethingElse", "x.bin" } };
        var upload = await client.PostAsync(new Uri("/api/photos", UriKind.Relative), form);

        Assert.Equal(HttpStatusCode.BadRequest, upload.StatusCode);
    }

    [Fact]
    public async Task UnknownPhotoId_Is404()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(
            new Uri($"/api/photos/{new string('a', 32)}.jpg", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

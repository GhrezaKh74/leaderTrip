using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace LeaderTrip.Api.Tests;

public sealed class AuthEndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuthEndpointTests(ApiFactory factory) => _factory = factory;

    private sealed record User(Guid Id, string Email, string DisplayName);

    private sealed record Auth(string Token, User User);

    private sealed record Trip(Guid Id, string Title, string Payload, DateTimeOffset UpdatedAt);

    private sealed record ProblemBody(string Detail, string Code);

    private static string UniqueEmail() => $"user-{Guid.NewGuid():N}@example.com";

    private async Task<(HttpClient Client, Auth Auth)> RegisterAsync(string? email = null)
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new { email = email ?? UniqueEmail(), password = "خیلی-محرمانه-۱۲۳", displayName = "لیدر تست" });

        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<Auth>();

        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        return (client, auth);
    }

    [Fact]
    public async Task Register_ReturnsTokenAndMeWorks()
    {
        var (client, auth) = await RegisterAsync();

        Assert.NotEmpty(auth.Token);
        Assert.Equal("لیدر تست", auth.User.DisplayName);

        var me = await client.GetFromJsonAsync<User>(new Uri("/api/auth/me", UriKind.Relative));

        Assert.NotNull(me);
        Assert.Equal(auth.User.Id, me.Id);
    }

    [Fact]
    public async Task DuplicateEmail_IsConflict()
    {
        string email = UniqueEmail();

        await RegisterAsync(email);

        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new { email, password = "خیلی-محرمانه-۱۲۳", displayName = "دومی" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task WrongPassword_IsRejected_WithSameMessageAsUnknownEmail()
    {
        string email = UniqueEmail();

        await RegisterAsync(email);

        using var client = _factory.CreateClient();

        var wrongPassword = await client.PostAsJsonAsync(
            new Uri("/api/auth/login", UriKind.Relative),
            new { email, password = "اشتباه-اشتباه" });

        var unknownEmail = await client.PostAsJsonAsync(
            new Uri("/api/auth/login", UriKind.Relative),
            new { email = UniqueEmail(), password = "هرچی" });

        Assert.Equal(HttpStatusCode.Forbidden, wrongPassword.StatusCode);
        // پیام هر دو حالت باید یکی باشد؛ وگرنه می‌شود فهمید چه ایمیل‌هایی حساب دارند.
        // (کل بدنه مقایسه نمی‌شود چون traceId هر درخواست فرق دارد.)
        var wrongBody = await wrongPassword.Content.ReadFromJsonAsync<ProblemBody>();
        var unknownBody = await unknownEmail.Content.ReadFromJsonAsync<ProblemBody>();

        Assert.NotNull(wrongBody);
        Assert.NotNull(unknownBody);
        Assert.Equal(unknownBody.Detail, wrongBody.Detail);
        Assert.Equal(unknownBody.Code, wrongBody.Code);
    }

    [Fact]
    public async Task Me_WithoutToken_Is401()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/auth/me", UriKind.Relative));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_InvalidatesTheToken()
    {
        var (client, _) = await RegisterAsync();

        var logout = await client.PostAsync(new Uri("/api/auth/logout", UriKind.Relative), null);

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var me = await client.GetAsync(new Uri("/api/auth/me", UriKind.Relative));

        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }

    [Fact]
    public async Task SavedTrips_FullLifecycle()
    {
        var (client, _) = await RegisterAsync();

        var created = await client.PostAsJsonAsync(
            new Uri("/api/me/trips", UriKind.Relative),
            new { title = "سفر شمال", payload = """{"days":3}""" });

        created.EnsureSuccessStatusCode();

        var trip = await created.Content.ReadFromJsonAsync<Trip>();

        Assert.NotNull(trip);

        var list = await client.GetFromJsonAsync<List<Trip>>(new Uri("/api/me/trips", UriKind.Relative));

        Assert.NotNull(list);
        Assert.Contains(list, t => t.Id == trip.Id && t.Title == "سفر شمال");

        // به‌روزرسانی با همان شناسه
        var updated = await client.PostAsJsonAsync(
            new Uri("/api/me/trips", UriKind.Relative),
            new { id = trip.Id, title = "سفر شمال — ویرایش", payload = """{"days":4}""" });

        updated.EnsureSuccessStatusCode();

        list = await client.GetFromJsonAsync<List<Trip>>(new Uri("/api/me/trips", UriKind.Relative));

        Assert.NotNull(list);
        var edited = Assert.Single(list, t => t.Id == trip.Id);
        Assert.Equal("سفر شمال — ویرایش", edited.Title);

        var delete = await client.DeleteAsync(new Uri($"/api/me/trips/{trip.Id}", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        list = await client.GetFromJsonAsync<List<Trip>>(new Uri("/api/me/trips", UriKind.Relative));

        Assert.NotNull(list);
        Assert.DoesNotContain(list, t => t.Id == trip.Id);
    }

    /// <summary>سفرِ یک حساب برای حساب دیگر نه دیدنی است، نه نوشتنی، نه حذف‌شدنی.</summary>
    [Fact]
    public async Task Trips_AreIsolatedBetweenUsers()
    {
        var (alice, _) = await RegisterAsync();
        var (bob, _) = await RegisterAsync();

        var created = await alice.PostAsJsonAsync(
            new Uri("/api/me/trips", UriKind.Relative),
            new { title = "سفر خصوصی", payload = """{"days":2}""" });

        var trip = await created.Content.ReadFromJsonAsync<Trip>();

        Assert.NotNull(trip);

        var bobList = await bob.GetFromJsonAsync<List<Trip>>(new Uri("/api/me/trips", UriKind.Relative));

        Assert.NotNull(bobList);
        Assert.DoesNotContain(bobList, t => t.Id == trip.Id);

        // تصرف با «به‌روزرسانی» شناسهٔ دیگری هم ممکن نیست
        var hijack = await bob.PostAsJsonAsync(
            new Uri("/api/me/trips", UriKind.Relative),
            new { id = trip.Id, title = "تصرف", payload = """{"days":1}""" });

        Assert.Equal(HttpStatusCode.NotFound, hijack.StatusCode);

        var bobDelete = await bob.DeleteAsync(new Uri($"/api/me/trips/{trip.Id}", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, bobDelete.StatusCode);

        var aliceList = await alice.GetFromJsonAsync<List<Trip>>(new Uri("/api/me/trips", UriKind.Relative));

        Assert.NotNull(aliceList);
        Assert.Contains(aliceList, t => t.Id == trip.Id && t.Title == "سفر خصوصی");
    }
}

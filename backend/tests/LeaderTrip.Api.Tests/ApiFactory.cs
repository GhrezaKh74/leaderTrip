using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace LeaderTrip.Api.Tests;

/// <summary>میزبان برنامه برای تست، بدون شبکه و بدون پایگاه داده.</summary>
/// <remarks>
/// سرویس‌های بیرونی خاموش‌اند و رشتهٔ اتصال داده نشده، پس مخزن‌های حافظه‌ای فعال
/// می‌شوند. تستی که به اینترنت یا به یک سرور Postgres وابسته باشد، گاهی سبز است
/// و گاهی قرمز — و هیچ‌کدام دربارهٔ کد چیزی نمی‌گوید.
/// </remarks>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string AdminKey = "test-admin-key";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Routing:Enabled"] = "false",
                ["Weather:Enabled"] = "false",
                ["Api:AdminApiKey"] = AdminKey,

                // سقف بالا: این تست‌ها رفتار اندپوینت را می‌سنجند نه محدودساز را،
                // و سقف پایین باعث می‌شد ترتیب اجرای تست‌ها روی نتیجه اثر بگذارد.
                ["Api:RequestsPerMinute"] = "9999",
                ["Api:PlanRequestsPerMinute"] = "1000",

                // عکس‌ها در پوشهٔ موقت سیستم، نه کنار باینری تست؛ و سقف کوچک تا
                // تستِ «بزرگ‌تر از سقف» مجبور نباشد چند مگابایت بسازد.
                ["Photos:RootPath"] = Path.Combine(Path.GetTempPath(), $"leadertrip-api-photos-{Guid.NewGuid():N}"),
                ["Photos:MaxBytes"] = "60000",
            }));
    }
}

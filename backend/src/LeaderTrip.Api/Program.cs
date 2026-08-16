using System.Text.Json.Serialization;
using LeaderTrip.Api;
using LeaderTrip.Api.Endpoints;
using LeaderTrip.Application;
using LeaderTrip.Infrastructure;
using LeaderTrip.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<ApiOptions>()
    .Bind(builder.Configuration.GetSection(ApiOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// شمارشی‌ها با نام منتشر می‌شوند نه با عدد. عددِ خام در پاسخ یعنی مصرف‌کننده
// باید ترتیب تعریف enum را حدس بزند — و روزی که مقداری وسط فهرست اضافه شود،
// بی‌صدا همه‌چیز جابه‌جا می‌شود.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddLeaderTripRateLimiting();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

// دادهٔ مرجع در هر درخواست یکی است و روزی چند بار هم عوض نمی‌شود. بدون این،
// هر بازکردن ویزارد یک رفت‌وبرگشت کامل تا پایگاه داده است.
builder.Services.AddOutputCache(options =>
    options.AddPolicy("reference", policy => policy.Expire(TimeSpan.FromMinutes(10))));

var apiOptions = builder.Configuration.GetSection(ApiOptions.SectionName).Get<ApiOptions>() ?? new ApiOptions();

builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    // فهرست خالی یعنی هیچ مبدأ مرورگری مجاز نیست — بسته، نه باز.
    if (apiOptions.AllowedOrigins.Count > 0)
    {
        policy.WithOrigins([.. apiOptions.AllowedOrigins]).AllowAnyHeader().AllowAnyMethod();
    }
}));

var app = builder.Build();

// پشت پروکسی یا در داکر، بدون این، IP همهٔ درخواست‌ها یکی دیده می‌شود و
// محدودسازی نرخ عملاً سراسری می‌شود نه به‌ازای کلاینت.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

// استثنای پیش‌بینی‌نشده هرگز نباید جزئیات داخلی را بیرون بدهد؛ در لاگ کامل است.
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var feature = context.Features.Get<IExceptionHandlerFeature>();

    ApiLog.Unexpected(app.Logger, feature?.Error, context.Request.Path);

    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    context.Response.ContentType = "application/problem+json";

    await context.Response.WriteAsJsonAsync(new
    {
        title = "خطای غیرمنتظره",
        status = StatusCodes.Status500InternalServerError,
        detail = "درخواست پردازش نشد. اگر تکرار شد، به ما اطلاع دهید.",
        code = "server.unexpected",
    });
}));

app.UseCors();
app.UseRateLimiter();
app.UseOutputCache();

app.MapTripEndpoints();
app.MapPhotoEndpoints();
app.MapAdminIfConfigured();

app.MapHealthChecks("/health").AllowAnonymous();

if (app.Environment.IsDevelopment())
{
    // توصیف OpenAPI فقط در توسعه منتشر می‌شود: نقشهٔ کامل سطح حمله را
    // بی‌دلیل عمومی نمی‌کنیم.
    app.MapOpenApi();
}

// ساخت شِما و هم‌ترازسازی دادهٔ مرجع، فقط وقتی پایگاه داده‌ای در کار باشد.
if (app.Services.GetService<DatabaseInitializer>() is { } initializer)
{
    await initializer.InitializeAsync();
}

await app.RunAsync();

/// <summary>برای دسترسی تست‌های یکپارچگی به میزبان برنامه.</summary>
public partial class Program;

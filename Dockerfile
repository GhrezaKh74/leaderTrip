# ─────────────────── لیدرتریپ، تک‌کانتینری — برای هاست‌های پنلی ───────────────────
#
# این فایل کل اپ اصلی (رابط + بک‌اند .NET) را در «یک» ایمیج می‌سازد، برای
# هاست‌هایی که فقط یک Dockerfile می‌سازند و compose ندارند (مثل پنل داکر
# چابکان). روی سرورِ خودتان، راه اصلی همچنان `docker compose up -d --build`
# است (سه سرویس جدا، سخت‌گیری‌های بیشتر) — docs/07-deployment.md.
#
# بدون هیچ تنظیمی هم بالا می‌آید (دادهٔ مرجع داخل خود بک‌اند است)، ولی برای
# سرویس واقعی این متغیرهای محیطی را بدهید:
#
#   ConnectionStrings__LeaderTrip   رشتهٔ اتصال PostgreSQL (مثلاً سرویس آمادهٔ
#                                   هاست). بدونش حساب کاربری و ویرایش قیمت‌ها
#                                   با هر ری‌استارت از دست می‌روند.
#   Api__AdminApiKey                کلید پنل مدیریت (خالی = پنل خاموش)
#   Api__AllowedOrigins__0          آدرس سایت، مثل https://trip.example.ir
#
# پورت: 8080 — دامنه را در پنل به همین وصل کنید.
# volume (اختیاری): /data/photos عکس‌های چک‌این، /tiles نقشهٔ آفلاین ایران.
#
# نسخهٔ اول قدیمی اپ در `Dockerfile.legacy` است.

# ─────────────────────────── مرحلهٔ ۱: بیلد رابط ───────────────────────────
FROM node:22-alpine AS web-build

WORKDIR /web

COPY web/package.json web/package-lock.json ./
# Playwright از داخل ایمیج دانلود نشود: تست e2e این‌جا اجرا نمی‌شود.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

COPY web/ .

# تست بخشی از بیلد است: ایمیجی که تستش قرمز است نباید ساخته شود.
RUN npm test && npm run build

# ─────────────────────────── مرحلهٔ ۲: بیلد بک‌اند ─────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS api-build

WORKDIR /src

COPY backend/LeaderTrip.slnx backend/Directory.Build.props ./
COPY backend/src/LeaderTrip.Domain/*.csproj         src/LeaderTrip.Domain/
COPY backend/src/LeaderTrip.Application/*.csproj    src/LeaderTrip.Application/
COPY backend/src/LeaderTrip.Infrastructure/*.csproj src/LeaderTrip.Infrastructure/
COPY backend/src/LeaderTrip.Api/*.csproj            src/LeaderTrip.Api/
COPY backend/tests/Directory.Build.props            tests/
COPY backend/tests/LeaderTrip.Domain.Tests/*.csproj         tests/LeaderTrip.Domain.Tests/
COPY backend/tests/LeaderTrip.Infrastructure.Tests/*.csproj tests/LeaderTrip.Infrastructure.Tests/
COPY backend/tests/LeaderTrip.Api.Tests/*.csproj            tests/LeaderTrip.Api.Tests/

RUN dotnet restore LeaderTrip.slnx

COPY backend/ .

RUN dotnet test LeaderTrip.slnx --configuration Release --nologo

RUN dotnet publish src/LeaderTrip.Api/LeaderTrip.Api.csproj \
      --configuration Release \
      --output /app/publish \
      /p:UseAppHost=false

# ─────────────────────────── مرحلهٔ ۳: اجرا ────────────────────────────────
# nginx و بک‌اند کنار هم در یک کانتینر: nginx روی ۸۰۸۰ به بیرون، بک‌اند روی
# ۵۰۰۰ فقط روی لوپ‌بک، و همان پیکربندی nginx نسخهٔ compose — فقط مقصد پروکسی
# از «api:8080» به «127.0.0.1:5000» عوض می‌شود تا یک منبع حقیقت بماند.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime

RUN apk add --no-cache nginx

WORKDIR /app

COPY --from=api-build /app/publish ./
COPY --from=web-build /web/dist /usr/share/nginx/html
COPY web/docker/security-headers.conf /etc/nginx/security-headers.conf
COPY web/docker/nginx.conf /tmp/nginx.conf

RUN sed 's|http://api:8080|http://127.0.0.1:5000|' /tmp/nginx.conf \
      > /etc/nginx/http.d/default.conf \
    && rm /tmp/nginx.conf \
    && mkdir -p /data/photos /tiles /run/nginx \
    # اگر هرکدام از دو پروسه بمیرد، کانتینر می‌میرد تا ارکستریتور/پنل
    # ری‌استارتش کند — کانتینرِ نیمه‌زنده بدترین حالت است.
    && printf '%s\n' \
      '#!/bin/sh' \
      'set -e' \
      'dotnet /app/LeaderTrip.Api.dll &' \
      'API=$!' \
      'nginx -g "daemon off;" &' \
      'NGINX=$!' \
      'while kill -0 "$API" 2>/dev/null && kill -0 "$NGINX" 2>/dev/null; do sleep 5; done' \
      'exit 1' \
      > /start.sh \
    && chmod +x /start.sh

ENV ASPNETCORE_URLS=http://127.0.0.1:5000 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_NOLOGO=1 \
    Photos__RootPath=/data/photos

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=25s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ \
      && wget -q --spider http://127.0.0.1:5000/health || exit 1

CMD ["/start.sh"]

# ─────────────────────────── مرحلهٔ ۱: بیلد ───────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build

WORKDIR /src

# فایل‌های پروژه جدا از کد کپی می‌شوند تا با هر تغییر کد، بسته‌ها دوباره
# بازیابی نشوند.
COPY LeaderTrip.slnx Directory.Build.props ./
COPY src/LeaderTrip.Domain/*.csproj         src/LeaderTrip.Domain/
COPY src/LeaderTrip.Application/*.csproj    src/LeaderTrip.Application/
COPY src/LeaderTrip.Infrastructure/*.csproj src/LeaderTrip.Infrastructure/
COPY src/LeaderTrip.Api/*.csproj            src/LeaderTrip.Api/
COPY tests/Directory.Build.props            tests/
COPY tests/LeaderTrip.Domain.Tests/*.csproj         tests/LeaderTrip.Domain.Tests/
COPY tests/LeaderTrip.Infrastructure.Tests/*.csproj tests/LeaderTrip.Infrastructure.Tests/
COPY tests/LeaderTrip.Api.Tests/*.csproj            tests/LeaderTrip.Api.Tests/

RUN dotnet restore LeaderTrip.slnx

COPY . .

# تست بخشی از بیلد است: ایمیجی که تستش قرمز است نباید ساخته شود.
# `TreatWarningsAsErrors` هم روشن است، پس هشدار تحلیل‌گر هم بیلد را می‌شکند.
RUN dotnet test LeaderTrip.slnx --configuration Release --nologo

RUN dotnet publish src/LeaderTrip.Api/LeaderTrip.Api.csproj \
      --configuration Release \
      --output /app/publish \
      /p:UseAppHost=false

# ─────────────────────────── مرحلهٔ ۲: اجرا ───────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime

WORKDIR /app

COPY --from=build /app/publish ./

# اجرا با کاربر غیر root. به همین دلیل پورت ۸۰۸۰ است نه ۸۰: پروسهٔ غیر root
# اجازهٔ گرفتن پورت‌های زیر ۱۰۲۴ را ندارد.
RUN addgroup -S leadertrip && adduser -S leadertrip -G leadertrip \
    && chown -R leadertrip:leadertrip /app

USER leadertrip

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_NOLOGO=1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["dotnet", "LeaderTrip.Api.dll"]

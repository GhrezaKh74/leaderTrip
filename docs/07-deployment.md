# ۷. استقرار روی سرور — از جمله هاست داکر چابکان

کل اپ با یک `docker compose up -d --build` بالا می‌آید (سه سرویس: nginx،
بک‌اند .NET، و PostgreSQL). پس هر جایی که «داکر + کامپوز» داشته باشد —
هاست داکر چابکان، سرور مجازی، یا هر ابر دیگری — همین دستورها کار می‌کنند.

> **هشدار مهم:** `Dockerfile` ریشهٔ مخزن مال **نسخهٔ اول (قدیمی)** اپ است و
> عمداً تا بازنشستگی نگه داشته شده. اگر پنل هاست، خودکار «Dockerfile ریشه»
> را بسازد، همان نسخهٔ قدیمی را می‌سازد — نه اپ اصلی. اپ اصلی سه‌سرویسه
> است و فقط از راه `docker-compose.yml` (پایین) درست بالا می‌آید؛
> Dockerfileهایش در `web/` و `backend/` هستند.

## گام‌به‌گام

### ۱. اتصال به سرور

از پنل چابکان دسترسی ترمینال/SSH سرویس داکر را بردارید و وصل شوید. مطمئن
شوید داکر و کامپوز هست:

```bash
docker --version && docker compose version
```

### ۲. آوردن کد

```bash
git clone https://github.com/GhrezaKh74/leaderTrip.git
cd leaderTrip
```

(اگر مخزن خصوصی است، از توکن دسترسی گیت‌هاب استفاده کنید؛ یا فایل‌ها را با
`scp`/آپلود پنل منتقل کنید.)

### ۳. تنظیمات — تنها بخشی که فکر می‌خواهد

```bash
cp .env.example .env
nano .env
```

| متغیر | مقدار روی سرور واقعی |
|---|---|
| `POSTGRES_PASSWORD` | **اجباری** — یک رمز قوی: `openssl rand -base64 24` |
| `ADMIN_API_KEY` | کلید پنل مدیریت: `openssl rand -base64 32` (خالی = پنل خاموش) |
| `WEB_ORIGIN` | آدرس واقعی سایت، مثل `https://trip.example.ir` |
| `PORT` | پورتی که رابط کاربری روی میزبان می‌گیرد (پیش‌فرض ۸۰۸۰) |
| `API_PORT` | فقط برای دسترسی مستقیم/اشکال‌زدایی به بک‌اند؛ می‌توانید در فایروال ببندید |

### ۴. بالاآوردن

```bash
docker compose up -d --build
docker compose ps        # هر سه سرویس باید healthy شوند
```

بار اول چند دقیقه طول می‌کشد (بیلد وب و بک‌اند + دانلود ایمیج‌های پایه).

### ۵. دامنه و HTTPS

در پنل چابکان دامنه/زیردامنه را به همان پورت `PORT` (پیش‌فرض ۸۰۸۰) سرویس
وصل کنید و SSL را از پنل فعال کنید — رایج‌ترین حالت این است که پراکسی/لبهٔ
خود پلتفرم، HTTPS را ترمینیت می‌کند و ترافیک را به پورت شما می‌فرستد؛ nginx
داخل کانتینر لازم نیست چیزی از TLS بداند. بعد از اتصال دامنه، `WEB_ORIGIN`
در `.env` را با همان آدرس https به‌روز و `docker compose up -d` بزنید.

### ۶. (اختیاری، توصیه‌شده) نقشهٔ آفلاین ایران

یک‌بار، همان‌جا روی سرور:

```bash
docker compose --profile tiles up   # ~۱ تا ۲ گیگابایت؛ صبر کنید تمام شود
docker compose up -d
```

جزئیات در `maps/README.md`. اگر دیسک سرویس کوچک است، قبلش جا را چک کنید
(`df -h`)؛ کاشی‌ها در volume می‌مانند و با ری‌استارت پاک نمی‌شوند.

## اگر دانلود ایمیج‌ها خطای تحریم داد

ایمیج‌های پایهٔ این پروژه: `node`، `nginx`، `postgres` (از Docker Hub) و
`dotnet/sdk`/`aspnet` (از `mcr.microsoft.com`). از داخل ایران گاهی مستقیم
نمی‌آیند:

- برای Docker Hub، آینه (registry mirror) تنظیم کنید — چابکان خودش آینهٔ
  رجیستری دارد (مستنداتش را ببینید)؛ آینه‌های عمومی ایرانی مثل
  `https://docker.arvancloud.ir` هم کار می‌کنند:

  ```bash
  # /etc/docker/daemon.json
  { "registry-mirrors": ["https://docker.arvancloud.ir"] }
  # بعد: systemctl restart docker
  ```

- برای `mcr.microsoft.com` (ایمیج‌های .NET) اگر آینه در دسترس نبود،
  راه مطمئن این است که ایمیج‌ها را روی سیستم خودتان بسازید و به یک رجیستری
  (Docker Hub یا رجیستری خصوصی چابکان) push کنید:

  ```bash
  # روی سیستم خودتان:
  docker compose build
  docker tag leadertrip-web:latest  YOUR_USER/leadertrip-web:latest
  docker tag leadertrip-api:latest  YOUR_USER/leadertrip-api:latest
  docker push YOUR_USER/leadertrip-web:latest
  docker push YOUR_USER/leadertrip-api:latest
  ```

  و روی سرور، در `docker-compose.yml` به‌جای `build:` هر سرویس، همان
  `image: YOUR_USER/...` را بگذارید و `docker compose up -d` (بدون
  `--build`) بزنید.

## به‌روزرسانی نسخه

```bash
cd leaderTrip
git pull
docker compose up -d --build   # فقط چیزهای تغییرکرده از نو ساخته می‌شوند
```

دادهٔ کاربران دست‌نخورده می‌ماند: پایگاه داده، عکس‌های چک‌این و کاشی‌های
نقشه هر سه در volume هستند و مهاجرت‌های پایگاه داده هم هنگام بالاآمدن
بک‌اند خودکار اجرا می‌شوند.

## پشتیبان‌گیری

```bash
# پایگاه داده (حساب‌ها، سفرهای ذخیره‌شده، قیمت‌ها)
docker exec leadertrip-db pg_dump -U leadertrip leadertrip > backup-$(date +%F).sql

# عکس‌های چک‌این
docker run --rm -v leadertrip_photo-data:/data -v "$PWD":/out alpine \
  tar czf /out/photos-$(date +%F).tar.gz -C /data .
```

## عیب‌یابی سریع

| نشانه | نگاه اول |
|---|---|
| سرویسی `healthy` نمی‌شود | `docker compose logs api` یا `logs app` |
| «رمز پایگاه داده لازم است» | `POSTGRES_PASSWORD` در `.env` خالی است |
| ورود/ثبت‌نام کار نمی‌کند | `WEB_ORIGIN` با آدرس واقعی سایت نمی‌خواند |
| نقشه آنلاین است نه آفلاین | پروفایل tiles اجرا نشده — گام ۶ |
| پنل `/?admin` ۴۰۴ می‌دهد | `ADMIN_API_KEY` خالی است (عمداً ثبت نمی‌شود) |

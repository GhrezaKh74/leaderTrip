# ─────────────────────────── مرحلهٔ ۱: بیلد ───────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# وابستگی‌ها جدا از کد کپی می‌شوند تا با هر تغییر کد، دوباره نصب نشوند
COPY package.json package-lock.json ./
# Playwright از داخل ایمیج دانلود نشود: تست e2e این‌جا اجرا نمی‌شود.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

COPY . .

# تست بخشی از بیلد است: ایمیجی که تستش قرمز است نباید ساخته شود.
# `npm run build` خودش تایپ‌چک را هم اجرا می‌کند (tsc -b && vite build).
RUN npm test && npm run build

# ─────────────────────────── مرحلهٔ ۲: سرو ────────────────────────────
# خروجی ایستاست + یک پروکسی /api به بک‌اند، تا مرورگر همه‌چیز را از یک
# مبدأ ببیند — CORS بسته می‌ماند و توکن‌ها به مبدأ غریبه نمی‌روند.
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf            /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist       /usr/share/nginx/html

# اجرا با کاربر غیر root. به همین دلیل nginx روی ۸۰۸۰ گوش می‌دهد، نه ۸۰:
# پروسهٔ غیر root اجازهٔ گرفتن پورت‌های زیر ۱۰۲۴ را ندارد.
RUN chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

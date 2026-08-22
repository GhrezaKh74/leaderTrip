import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'

/**
 * دربارهٔ لیدرتریپ — اعتماد با شفافیت ساخته می‌شود، نه با ادعا.
 *
 * <p>سه پرسشی که هر کاربر جدی پیش از اعتماد می‌پرسد: داده‌ام کجاست؟ این ارقام
 * از کجا آمده‌اند؟ اگر مشکلی بود به کی بگویم؟ این صفحه به هر سه، کوتاه و
 * بی‌طفره جواب می‌دهد.</p>
 */
export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <span style={{ flexGrow: 1 }}>دربارهٔ لیدرتریپ</span>
        <IconButton aria-label="بستن" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5}>
          <Typography variant="body2">
            لیدرتریپ دستیار لیدر سفرهای جاده‌ای ایران است: برنامهٔ ساعت‌به‌ساعت،
            تخمین هزینهٔ قابل‌ردیابی، چک‌لیست بار و تسویه‌حساب گروهی — برای
            کسی که مسئولیت سفر جمع را قبول کرده است.
          </Typography>

          <Section title="داده‌های شما کجاست؟">
            سفرها، برنامه‌ها، چک‌این‌ها و هزینه‌ها روی همین دستگاه شما
            می‌مانند و بدون خواست شما جایی نمی‌روند. تنها استثناها: اگر حساب
            بسازید، ورودی سفرهایی که خودتان ذخیره می‌کنید روی سرور می‌رود؛ و
            عکس‌هایی که به چک‌این پیوست می‌کنید روی سرور ذخیره می‌شوند — بدون
            اینکه سرور بداند مال کدام سفرند. موقعیت مکانی شما هرگز به سرور
            فرستاده نمی‌شود.
          </Section>

          <Section title="ارقام از کجا می‌آیند؟">
            مسافت‌ها از سرویس مسیریابی آزاد (OSRM) یا تخمین جغرافیایی،
            آب‌وهوا از Open-Meteo، نقشه و مکان‌ها از OpenStreetMap و
            مشارکت‌کنندگانش، و قیمت‌های پایه از دیتاست خود لیدرتریپ.{' '}
            <b>همهٔ ارقام تخمینی‌اند</b> و فرمول هر قلم هزینه در تب «هزینه»
            نشان داده می‌شود تا خودتان بتوانید با نرخ روز بازحساب کنید.
          </Section>

          <Section title="پیشنهاد یا مشکلی دارید؟">
            لیدرتریپ متن‌باز است. گزارش مشکل، پیشنهاد جاذبهٔ تازه یا اصلاح
            داده‌ها را در{' '}
            <Link
              href="https://github.com/GhrezaKh74/leaderTrip/issues"
              target="_blank"
              rel="noopener"
            >
              صفحهٔ گیت‌هاب پروژه
            </Link>{' '}
            ثبت کنید.
          </Section>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
        {children}
      </Typography>
    </Stack>
  )
}

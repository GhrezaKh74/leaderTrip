/* oxlint-disable react/only-export-components -- کارخانهٔ `make` عمداً کنار
   آیکون‌هاست: هر آیکون سه خط است و جداکردن کارخانه یعنی دو فایل برای یک مفهوم.
   بهایش فقط از دست رفتن fast-refresh همین فایل است. */
import type { ReactNode } from 'react'
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon'

/**
 * آیکون‌های اختصاصی لیدرتریپ.
 *
 * <p><b>زبان مشترک:</b> خطی با ضخامت ۱٫۸، سر و گوشهٔ گرد، روی شبکهٔ ۲۴.
 * چیزی که پُر می‌شود فقط نقطهٔ کانونی است (ستارهٔ داخل سنجاق، هلال ماه، سوزن
 * قطب‌نما) — یک تأکید در هر آیکون، نه بیشتر.</p>
 *
 * <p><b>امضای ایرانی، عمدی:</b> توقف استراحت استکان چای است (فرهنگ «بین راه
 * چای» جاده‌های ایران)، لوگو گرهٔ هشت‌پر خاتم است، و جاذبه ستارهٔ چهارپر
 * کاشی. آیکون عمومی برای هر اپی کار می‌کند — این‌ها برای همین اپ‌اند.</p>
 *
 * <p>کنش‌های کاملاً عمومی (افزودن، پیکان‌ها، حذف) عمداً از Material می‌مانند:
 * آن‌جا قرارداد آشنا مهم‌تر از امضای برند است.</p>
 *
 * <p>گالری کنترل کیفیت: <code>/?icons</code> — هر آیکون تازه باید آن‌جا با
 * چشم دیده شود؛ مسیر SVG کور نوشته می‌شود و کور هم خراب می‌شود.</p>
 */

function make(name: string, children: ReactNode, viewBox = '0 0 24 24') {
  function Icon(props: SvgIconProps) {
    return (
      <SvgIcon {...props} viewBox={viewBox}>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {children}
        </g>
      </SvgIcon>
    )
  }

  Icon.displayName = name

  return Icon
}

/** پُر با رنگ جاری — برای نقطهٔ کانونی هر آیکون. */
const fill = { fill: 'currentColor', stroke: 'none' } as const

// ─── برند ────────────────────────────────────────────────────────────────

/**
 * گرهٔ هشت‌پر خاتم — لوگو.
 *
 * دایرهٔ قطب‌نما فقط در فاوآیکون هست (آن‌جا ۶۴ پیکسل جا دارد)؛ در اندازهٔ
 * آیکون، سه شکل روی هم متراکم می‌شود و ستاره گم می‌شود.
 */
export const LogoIcon = make(
  'LogoIcon',
  <>
    <path d="M6.4 6.4 H17.6 V17.6 H6.4 Z" />
    <path d="M12 4.1 L19.9 12 L12 19.9 L4.1 12 Z" />
    <circle cx="12" cy="12" r="1.5" {...fill} />
  </>,
)

export const CompassIcon = make(
  'CompassIcon',
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M15.2 8.8 L13.3 13.3 L8.8 15.2 L10.7 10.7 Z" {...fill} />
  </>,
)

// ─── تب‌های برنامه ──────────────────────────────────────────────────────

/** مسیر پیچ‌درپیچ از مبدأ تا مقصد — تب «برنامه». */
export const RouteIcon = make(
  'RouteIcon',
  <>
    <circle cx="5" cy="19" r="1.9" {...fill} />
    <path d="M6.9 19 C11 19 9.3 12 13.2 12 C17 12 15.2 5.3 19 5.3" />
    <circle cx="19" cy="5.3" r="2.4" />
  </>,
)

export const CostIcon = make(
  'CostIcon',
  <>
    <rect x="2.8" y="6.8" width="18.4" height="10.4" rx="2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6.1 11 V13 M17.9 11 V13" />
  </>,
)

export const SavingsIcon = make(
  'SavingsIcon',
  <>
    <path d="M4 8 L10.4 14.4 L13.6 11.2 L20 17.6" />
    <path d="M20 17.6 H15.7 M20 17.6 V13.3" />
  </>,
)

export const ShieldIcon = make(
  'ShieldIcon',
  <>
    <path d="M12 3 L19 5.8 V11 C19 15.9 16.1 19.4 12 21 C7.9 19.4 5 15.9 5 11 V5.8 Z" />
    <path d="M12 8 V13" />
    <circle cx="12" cy="16.2" r="0.4" {...fill} />
  </>,
)

export const ChecklistIcon = make(
  'ChecklistIcon',
  <>
    <rect x="5" y="4.2" width="14" height="16.6" rx="2" />
    <rect x="9" y="2.6" width="6" height="3.2" rx="1.2" />
    <path d="M8.2 11 L9.9 12.7 L12.9 9.5" />
    <path d="M8.2 16.4 L9.9 18.1 L12.9 14.9" />
    <path d="M15.2 11.6 H16 M15.2 17 H16" />
  </>,
)

export const MapIcon = make(
  'MapIcon',
  <>
    <path d="M3.5 6.2 L9.2 4.2 L14.8 6.2 L20.5 4.2 V17.8 L14.8 19.8 L9.2 17.8 L3.5 19.8 Z" />
    <path d="M9.2 4.2 V17.8 M14.8 6.2 V19.8" />
  </>,
)

/** پرچم توقف — تب «حین سفر». */
export const FlagIcon = make(
  'FlagIcon',
  <>
    <path d="M6.2 21 V3.6" />
    <path d="M6.2 4.6 H16.8 L14.4 7.9 L16.8 11.2 H6.2 Z" />
  </>,
)

// ─── بلوک‌های برنامهٔ روز ───────────────────────────────────────────────

export const CarIcon = make(
  'CarIcon',
  <>
    <path d="M4 16.2 V13.5 C4 12.4 4.9 11.5 6 11.5 L7.4 7.9 C7.8 6.8 8.8 6.2 9.9 6.2 H14.1 C15.2 6.2 16.2 6.8 16.6 7.9 L18 11.5 C19.1 11.5 20 12.4 20 13.5 V16.2" />
    <path d="M6.4 11.5 H17.6" />
    <circle cx="7.6" cy="16.6" r="1.9" />
    <circle cx="16.4" cy="16.6" r="1.9" />
  </>,
)

/** سنجاق مکان با ستارهٔ چهارپر کاشی — بازدید از جاذبه. */
export const VisitPinIcon = make(
  'VisitPinIcon',
  <>
    <path d="M12 21.2 C12 21.2 5.2 14.8 5.2 9.7 C5.2 5.9 8.2 3 12 3 C15.8 3 18.8 5.9 18.8 9.7 C18.8 14.8 12 21.2 12 21.2 Z" />
    <path d="M12 6.4 L12.9 9 L15.5 9.9 L12.9 10.8 L12 13.4 L11.1 10.8 L8.5 9.9 L11.1 9 Z" {...fill} />
  </>,
)

export const MealIcon = make(
  'MealIcon',
  <>
    <path d="M7.5 20.4 V9.6" />
    <path d="M5 3.6 V6.8 C5 8.4 6.1 9.6 7.5 9.6 C8.9 9.6 10 8.4 10 6.8 V3.6" />
    <path d="M7.5 3.6 V6.6" />
    <ellipse cx="16.3" cy="6.2" rx="2.5" ry="3.3" />
    <path d="M16.3 9.5 V20.4" />
  </>,
)

/**
 * استکان چای — توقف استراحت.
 *
 * در جادهٔ ایرانی، استراحت یعنی «بزنیم کنار یه چای بخوریم». آیکون نیمکت یا
 * علامت توقف همین را نمی‌گوید.
 */
export const TeaIcon = make(
  'TeaIcon',
  <>
    <path d="M8 9.6 L9.2 20 H14.8 L16 9.6 Z" />
    <path d="M8.9 12.6 H15.1" />
    <path d="M7.4 21.8 H16.6" />
    <path d="M10.6 3.2 C10.1 4.4 11.1 5.1 10.6 6.4 M13.4 3.2 C12.9 4.4 13.9 5.1 13.4 6.4" />
  </>,
)

export const LodgingIcon = make(
  'LodgingIcon',
  <>
    <path d="M4 19.8 V11" />
    <path d="M4 15 H20 V19.8" />
    <rect x="6" y="12.2" width="4.4" height="2.8" rx="1" />
    <path d="M17.6 3.4 A3.7 3.7 0 1 0 21.2 8.2 A4.7 4.7 0 0 1 17.6 3.4 Z" {...fill} />
  </>,
)

export const FuelIcon = make(
  'FuelIcon',
  <>
    <rect x="4.6" y="4.6" width="8.8" height="15" rx="1.6" />
    <rect x="6.6" y="7" width="4.8" height="3.8" rx="0.8" />
    <path d="M3.6 20.6 H14.4" />
    <path d="M13.4 9.4 H15.4 C16.3 9.4 17 10.1 17 11 V15.6 C17 16.5 17.7 17.2 18.6 17.2 C19.5 17.2 20.2 16.5 20.2 15.6 V8.4 L18.4 6.2" />
  </>,
)

// ─── گام‌های ویزارد ─────────────────────────────────────────────────────

export const PinPointIcon = make(
  'PinPointIcon',
  <>
    <path d="M12 21.2 C12 21.2 5.2 14.8 5.2 9.7 C5.2 5.9 8.2 3 12 3 C15.8 3 18.8 5.9 18.8 9.7 C18.8 14.8 12 21.2 12 21.2 Z" />
    <circle cx="12" cy="9.7" r="2.4" />
  </>,
)

export const PeopleIcon = make(
  'PeopleIcon',
  <>
    <circle cx="9" cy="7.8" r="3.1" />
    <path d="M3.8 19.4 C3.8 15.9 6 13.7 9 13.7 C12 13.7 14.2 15.9 14.2 19.4" />
    <circle cx="16.9" cy="8.7" r="2.4" />
    <path d="M16.6 13.7 C19.1 14 20.5 15.9 20.5 19.4" />
  </>,
)

export const SlidersIcon = make(
  'SlidersIcon',
  <>
    <path d="M4 7.2 H20 M4 12 H20 M4 16.8 H20" />
    <circle cx="14.6" cy="7.2" r="1.9" {...fill} />
    <circle cx="8.6" cy="12" r="1.9" {...fill} />
    <circle cx="16.4" cy="16.8" r="1.9" {...fill} />
  </>,
)

// ─── آب‌وهوا ────────────────────────────────────────────────────────────

export const SunIcon = make(
  'SunIcon',
  <>
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 2.8 V4.9 M12 19.1 V21.2 M2.8 12 H4.9 M19.1 12 H21.2 M5.5 5.5 L7 7 M17 17 L18.5 18.5 M18.5 5.5 L17 7 M7 17 L5.5 18.5" />
  </>,
)

export const MoonIcon = make(
  'MoonIcon',
  <>
    {/* برش داخلی عمیق — هلالِ کم‌عمق مثل دایرهٔ شکسته دیده می‌شود، نه ماه. */}
    <path d="M20.4 13.2 A8.8 8.8 0 1 1 10.8 3.6 A7.2 7.2 0 0 0 20.4 13.2 Z" />
  </>,
)

const cloudPath = 'M7.4 15.8 H16.4 A3.7 3.7 0 0 0 16.9 8.5 A5.4 5.4 0 0 0 6.6 9.9 A3.3 3.3 0 0 0 7.4 15.8 Z'

export const RainIcon = make(
  'RainIcon',
  <>
    <path d={cloudPath} />
    <path d="M9.2 18 L8.4 20.2 M12.6 18 L11.8 20.2 M16 18 L15.2 20.2" />
  </>,
)

export const SnowIcon = make(
  'SnowIcon',
  <>
    <path d={cloudPath} />
    <circle cx="9" cy="19" r="0.7" {...fill} />
    <circle cx="12.4" cy="20.2" r="0.7" {...fill} />
    <circle cx="15.8" cy="19" r="0.7" {...fill} />
  </>,
)

// ─── کنش‌ها ─────────────────────────────────────────────────────────────

export const ShareIcon = make(
  'ShareIcon',
  <>
    <circle cx="6" cy="12" r="2.3" />
    <circle cx="17.4" cy="5.6" r="2.3" />
    <circle cx="17.4" cy="18.4" r="2.3" />
    <path d="M8.1 10.9 L15.3 6.7 M8.1 13.1 L15.3 17.3" />
  </>,
)

export const PrintIcon = make(
  'PrintIcon',
  <>
    <path d="M7.2 9 V4.4 H16.8 V9" />
    <path d="M7.2 16.4 H5.8 C4.7 16.4 4.4 15.7 4.4 14.9 V10.6 C4.4 9.7 5.1 9 6 9 H18 C18.9 9 19.6 9.7 19.6 10.6 V14.9 C19.6 15.7 19.3 16.4 18.2 16.4 H16.8" />
    <rect x="7.2" y="13.4" width="9.6" height="6.4" rx="0.8" />
    <circle cx="17" cy="11.4" r="0.5" {...fill} />
  </>,
)

export const DownloadIcon = make(
  'DownloadIcon',
  <>
    <path d="M4.6 15.4 V18.2 C4.6 19.3 5.5 20.2 6.6 20.2 H17.4 C18.5 20.2 19.4 19.3 19.4 18.2 V15.4" />
    <path d="M12 3.8 V14.6 M8.4 11.2 L12 14.8 L15.6 11.2" />
  </>,
)

export const UploadIcon = make(
  'UploadIcon',
  <>
    <path d="M4.6 15.4 V18.2 C4.6 19.3 5.5 20.2 6.6 20.2 H17.4 C18.5 20.2 19.4 19.3 19.4 18.2 V15.4" />
    <path d="M12 14.6 V3.8 M8.4 7.2 L12 3.6 L15.6 7.2" />
  </>,
)

/** ناوبری — پیکان قطب‌نمای در حرکت؛ نیمهٔ پُر جهت را قاطع می‌کند. */
export const NavigateIcon = make(
  'NavigateIcon',
  <>
    <path d="M12 3.6 L19.6 20 L12 15.8 L4.4 20 Z" />
    <path d="M12 3.6 L19.6 20 L12 15.8 Z" {...fill} />
  </>,
)

/** کاربر — سر و شانه؛ بی‌نقطهٔ پُر، چون خودِ چهره کانون است. */
export const UserIcon = make(
  'UserIcon',
  <>
    <circle cx="12" cy="8.4" r="3.6" />
    <path d="M4.9 19.6 C5.7 16 8.5 14.1 12 14.1 C15.5 14.1 18.3 16 19.1 19.6" />
  </>,
)

/** دوربین — بدنه، برجستگی نمایاب و عدسی؛ نقطهٔ کانونی مرکز عدسی است. */
export const CameraIcon = make(
  'CameraIcon',
  <>
    <path d="M4.6 8.4 C4.6 7.3 5.5 6.4 6.6 6.4 H8.5 L10 4.6 H14 L15.5 6.4 H17.4 C18.5 6.4 19.4 7.3 19.4 8.4 V17.2 C19.4 18.3 18.5 19.2 17.4 19.2 H6.6 C5.5 19.2 4.6 18.3 4.6 17.2 Z" />
    <circle cx="12" cy="12.6" r="3.4" />
    <circle cx="12" cy="12.6" r="1.3" {...fill} />
  </>,
)

/** تقویم — قاب با دو گیره و نقطهٔ کانونی روی «روزِ سفر». */
export const CalendarIcon = make(
  'CalendarIcon',
  <>
    <rect x="3.8" y="5" width="16.4" height="14.2" rx="3" />
    <path d="M3.8 9.4 H20.2 M8.2 3.2 V6.4 M15.8 3.2 V6.4" />
    <circle cx="12" cy="14.2" r="1.7" {...fill} />
  </>,
)

export const EditIcon = make(
  'EditIcon',
  <>
    <path d="M14.8 4.6 L19.4 9.2 L9 19.6 H4.4 V15 Z" />
    <path d="M13 6.4 L17.6 11" />
  </>,
)

export const PinIcon = make(
  'PinIcon',
  <>
    <path d="M12.2 4.2 L19.8 11.8 L17.2 12.4 C16.2 12.6 15.5 13 14.7 13.8 L13.3 15.2 L8.8 10.7 L10.2 9.3 C11 8.5 11.4 7.8 11.6 6.8 Z" />
    <path d="M8.8 15.2 L4.6 19.4" />
  </>,
)

export const BanIcon = make(
  'BanIcon',
  <>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M6.2 6.2 L17.8 17.8" />
  </>,
)

export const SearchIcon = make(
  'SearchIcon',
  <>
    <circle cx="10.8" cy="10.8" r="6" />
    <path d="M15.3 15.3 L20.4 20.4" />
  </>,
)

export const OfflineIcon = make(
  'OfflineIcon',
  <>
    <path d={cloudPath} />
    <path d="M5 4.4 L19.6 19" />
  </>,
)

export const CheckIcon = make(
  'CheckIcon',
  <>
    <path d="M5 12.6 L9.8 17.4 L19 7.4" />
  </>,
)

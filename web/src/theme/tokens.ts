/**
 * توکن‌های دیزاین لیدرتریپ — تنها منبع حقیقت هویت بصری.
 *
 * <p>سه رنگ، هر سه از کاشی‌کاری ایرانی: <b>فیروزه</b> رنگ اصلی است (رنگ گنبدها
 * و جاده‌های کویری آسمان‌آبی)، <b>لاجورد</b> عمق می‌دهد (کتیبه‌ها)، و
 * <b>زعفران</b> رنگ تأکید است (هزینه، هشدارهای ملایم). هر جای دیگری که رنگی
 * لازم شد باید از همین‌جا بیاید — رنگِ خارج از پالت، اولین قدمِ بی‌هویتی است.</p>
 *
 * <p>نقش پس‌زمینه گرهٔ هشت‌پر (خاتم) است: دو مربع چرخیده روی هم — همان نقشی
 * که در لوگو هم هست. یک زبان، همه‌جا.</p>
 */

export const brand = {
  /** فیروزه — رنگ اصلی برند. */
  turquoise: {
    main: '#0c7d84',
    dark: '#085d63',
    light: '#4db6bc',
    surface: '#e3f2f2',
  },

  /** لاجورد — عمق، گرادیان‌ها، بلوک اقامت. */
  lajvard: {
    main: '#1d3f77',
    dark: '#142c55',
    light: '#4c6ba8',
  },

  /** زعفران — تأکید، هزینه، وعده‌ها. */
  saffron: {
    main: '#d98a24',
    dark: '#b26e12',
    light: '#f2b45c',
  },

  /** سبز چای — استراحت، موفقیت. */
  tea: {
    main: '#4c7c54',
    light: '#7ba382',
  },

  /** اُخرا — سوخت‌گیری، خطاهای ملایم. */
  ochre: {
    main: '#b3552e',
  },
} as const

export const surfaces = {
  light: {
    background: '#f7f4ed',
    paper: '#fffdf8',
    divider: '#e6e0d4',
    ink: '#2b3440',
    inkSoft: '#5d6b7a',
  },
  dark: {
    background: '#0a1120',
    paper: '#121c2e00',
    paperSolid: '#121c2e',
    divider: '#22304a',
    ink: '#e8ecf2',
    inkSoft: '#9aa8bb',
  },
} as const

/** گرادیان برند: لاجورد → فیروزه. روی سطح‌های «قهرمان» و وضعیت فعال. */
export const heroGradient = `linear-gradient(135deg, ${brand.lajvard.main} 0%, ${brand.turquoise.main} 62%, #16a094 100%)`

/**
 * نقش گرهٔ هشت‌پر به‌صورت data-uri — بدون فایل جانبی و بدون درخواست شبکه.
 *
 * دو مربع چرخیده روی هم، همان هندسهٔ لوگو. کم‌رنگ است تا بافت باشد نه شلوغی:
 * نقشی که خودش را جلو بیندازد، دیگر پس‌زمینه نیست.
 */
export function girihPattern(strokeOpacity = 0.14, size = 46): string {
  const half = size / 2
  const inset = size * 0.26
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<g fill='none' stroke='%23ffffff' stroke-opacity='${strokeOpacity}'>` +
    `<rect x='${inset}' y='${inset}' width='${size - 2 * inset}' height='${size - 2 * inset}'/>` +
    `<path d='M${half} ${inset * 0.55} L${size - inset * 0.55} ${half} L${half} ${size - inset * 0.55} L${inset * 0.55} ${half} Z'/>` +
    `</g></svg>`

  return `url("data:image/svg+xml,${svg}")`
}

export const radii = {
  control: 10,
  card: 16,
  pill: 999,
} as const

/** سایه‌های نرم و کم — کارت‌ها با حاشیه جدا می‌شوند، نه با سایهٔ سنگین. */
export const shadows = {
  hover: '0 6px 20px -6px rgba(12, 125, 132, 0.35)',
  hero: '0 12px 32px -12px rgba(29, 63, 119, 0.45)',
} as const

/**
 * پس‌زمینهٔ محیطی — سه هالهٔ نرمِ رنگی از پالت برند، ثابت زیر همهٔ صفحه.
 *
 * <p>سطح تختِ تک‌رنگ «فرم اداری» می‌سازد؛ هالهٔ محیطی همان چیزی است که به
 * رابط‌های امروزی عمق می‌دهد — و چون از همان سه رنگ برند است، عمقِ بی‌هویت
 * نیست. شب: جادهٔ شبانه با شفق فیروزه‌ای. روز: آسمان صبحِ کویر.</p>
 */
export function ambientBackground(mode: 'light' | 'dark'): string {
  return mode === 'light'
    ? [
        `radial-gradient(640px 420px at 88% -8%, rgba(12,125,132,0.16), transparent 70%)`,
        `radial-gradient(520px 420px at -6% 24%, rgba(29,63,119,0.12), transparent 70%)`,
        `radial-gradient(720px 480px at 50% 118%, rgba(217,138,36,0.10), transparent 72%)`,
      ].join(', ')
    : [
        `radial-gradient(700px 460px at 85% -10%, rgba(67,198,192,0.16), transparent 70%)`,
        `radial-gradient(560px 460px at -8% 28%, rgba(77,107,168,0.20), transparent 72%)`,
        `radial-gradient(760px 500px at 55% 120%, rgba(240,180,92,0.08), transparent 72%)`,
      ].join(', ')
}

/**
 * شیشه‌مات — سطح‌های شناور (سرصفحه، نوار تب چسبان، کارت آمار).
 *
 * روی پس‌زمینهٔ محیطی، سطحِ کاملاً کدر وصله به‌نظر می‌رسد و کاملاً شفاف
 * ناخوانا؛ شیشه هر دو را حل می‌کند. فقط برای سطح‌های شناور — بلور روی ده‌ها
 * کارتِ فهرست، هم سنگین است هم بی‌معنا.
 */
export function glass(mode: 'light' | 'dark') {
  return mode === 'light'
    ? {
        backgroundColor: 'rgba(255, 253, 248, 0.68)',
        backdropFilter: 'blur(18px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
      }
    : {
        backgroundColor: 'rgba(20, 28, 45, 0.62)',
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
      }
}

/** متن گرادیانی برای تیترهای نمایشی — در شب با نسخهٔ روشن‌تر تا کنتراست نمیرد. */
export function textGradient(mode: 'light' | 'dark'): string {
  return mode === 'light'
    ? heroGradient
    : `linear-gradient(135deg, #7d97cf 0%, #43c6c0 60%, #7fdcd7 100%)`
}

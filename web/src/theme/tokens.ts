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
    background: '#0e1524',
    paper: '#16203100',
    paperSolid: '#161f31',
    divider: '#263349',
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

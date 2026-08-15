import { alpha, createTheme, type Theme } from '@mui/material/styles'
import { faIR } from '@mui/material/locale'

import { brand, heroGradient, radii, shadows, surfaces } from './tokens'

/**
 * تم لیدرتریپ — پیاده‌سازی توکن‌های `tokens.ts` روی MUI.
 *
 * چند تصمیم که با پیش‌فرض MUI فرق دارد و دلیل دارد:
 *
 * ۱. `direction: 'rtl'` تنها نصف کار است؛ نصف دیگر کش استایل با
 *    `stylis-plugin-rtl` در `RtlProvider` است — بدون آن هر فاصله در سمت
 *    اشتباه می‌نشیند.
 *
 * ۲. قلم وزیرمتن است، نه Roboto: فارسی با قلم لاتین رندر می‌شود ولی ارقام و
 *    «ی/ک» عربی خراب می‌شوند.
 *
 * ۳. کارت‌ها با حاشیه جدا می‌شوند نه سایه. سایهٔ سنگین روی پس‌زمینهٔ کاغذی
 *    ماسه‌ای، ظاهر «متریالِ خام» می‌سازد — همان چیزی که طراحی اختصاصی قرار
 *    است نسازد.
 *
 * ۴. ارقام فارسی کار لایهٔ نمایش است (`lib/format.ts`)، نه CSS: عرض و مقدار
 *    `input` باید لاتین بمانند وگرنه بی‌صدا از کار می‌افتند — درس نوار
 *    پیشرفتِ همیشه‌پُر نسخهٔ اول.
 */

const fontStack = [
  'Vazirmatn Variable',
  'Vazirmatn',
  'system-ui',
  '-apple-system',
  'Segoe UI',
  'sans-serif',
].join(', ')

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const surface = mode === 'light' ? surfaces.light : surfaces.dark
  const paper = mode === 'light' ? surfaces.light.paper : surfaces.dark.paperSolid

  return createTheme(
    {
      direction: 'rtl',
      palette: {
        mode,
        primary:
          mode === 'light'
            ? { main: brand.turquoise.main, dark: brand.turquoise.dark, light: brand.turquoise.light }
            : { main: '#43c6c0', dark: brand.turquoise.main, light: '#7fdcd7' },
        secondary:
          mode === 'light'
            ? { main: brand.saffron.main, dark: brand.saffron.dark, light: brand.saffron.light }
            : { main: '#f0b45c', dark: brand.saffron.main, light: '#f7cd8e' },
        // نگاشت معنایی به پالت برند: اقامت→لاجورد، استراحت→سبز چای،
        // سوخت→اُخرا. بلوک‌های برنامه از همین‌ها رنگ می‌گیرند.
        info: mode === 'light' ? { main: brand.lajvard.main, light: brand.lajvard.light } : { main: '#7d97cf' },
        success: mode === 'light' ? { main: brand.tea.main, light: brand.tea.light } : { main: '#84b28c' },
        warning: mode === 'light' ? { main: brand.ochre.main } : { main: '#d98a67' },
        divider: surface.divider,
        background: { default: surface.background, paper },
        text:
          mode === 'light'
            ? { primary: surfaces.light.ink, secondary: surfaces.light.inkSoft }
            : { primary: surfaces.dark.ink, secondary: surfaces.dark.inkSoft },
      },
      shape: { borderRadius: radii.control },
      typography: {
        fontFamily: fontStack,
        // خط فارسی بلندتر از لاتین است؛ با ارتفاع پیش‌فرض، اِعراب و دنبالهٔ
        // حروف به هم می‌چسبند.
        body1: { lineHeight: 1.9 },
        body2: { lineHeight: 1.8 },
        button: { fontWeight: 700, letterSpacing: 0 },
        h1: { fontSize: '2rem', fontWeight: 800 },
        h2: { fontSize: '1.55rem', fontWeight: 800 },
        h3: { fontSize: '1.25rem', fontWeight: 700 },
        h4: { fontSize: '1.1rem', fontWeight: 700 },
        subtitle1: { fontWeight: 600 },
        caption: { lineHeight: 1.7 },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { WebkitFontSmoothing: 'antialiased' },

            '::selection': {
              background: alpha(brand.turquoise.main, 0.25),
            },

            // اسکرول‌بار باریک و هم‌رنگ — جزئیاتی که «اختصاصی» را می‌سازند.
            '*::-webkit-scrollbar': { width: 10, height: 10 },
            '*::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              background: alpha(mode === 'light' ? brand.lajvard.main : '#7d97cf', 0.28),
            },
            '*::-webkit-scrollbar-track': { background: 'transparent' },

            // چاپ باید همان چیزی را بدهد که انتظار می‌رود، نه اسکرین‌شاتی از
            // رابط کاربری با منو و دکمه.
            '@media print': {
              '.no-print, header, nav, .MuiTabs-root, .MuiAlert-root': { display: 'none !important' },
              '.print-only': { display: 'block !important' },
              '#root > *:not(.print-root)': { display: 'none' },
              body: { background: '#fff', color: '#000' },
              '.MuiPaper-root': { border: 'none', boxShadow: 'none' },
              a: { textDecoration: 'none', color: '#000' },
            },
          },
        },

        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: {
              borderRadius: radii.control,
              paddingInline: 18,
              variants: [
                {
                  // دکمهٔ اصلی گرادیان برند را می‌گیرد — همان گرادیان قهرمان،
                  // تا «کنش اصلی» و «هویت» یک چیز باشند.
                  props: { variant: 'contained', color: 'primary' },
                  style: {
                    background: heroGradient,
                    transition: 'box-shadow .2s ease, transform .15s ease',
                    '&:hover': { boxShadow: shadows.hover, background: heroGradient },
                    '&:active': { transform: 'translateY(1px)' },
                  },
                },
                {
                  props: { variant: 'outlined' },
                  style: { borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
                },
              ],
            },
          },
        },

        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: ({ theme }) => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: radii.card,
              backgroundImage: 'none',
            }),
          },
        },

        MuiChip: {
          styleOverrides: {
            root: { fontWeight: 600, borderRadius: 8 },
          },
        },

        MuiTab: {
          styleOverrides: {
            root: {
              minHeight: 48,
              fontWeight: 600,
              // فاصلهٔ آیکون از متن در چیدمان راست‌به‌چپ
              '& .MuiTab-iconWrapper': { marginLeft: 6, marginRight: 0 },
            },
          },
        },

        MuiTabs: {
          styleOverrides: {
            indicator: {
              height: 3,
              borderRadius: 3,
            },
          },
        },

        MuiTextField: {
          defaultProps: { size: 'small', fullWidth: true },
        },

        MuiOutlinedInput: {
          styleOverrides: {
            root: { borderRadius: radii.control },
          },
        },

        MuiAlert: {
          styleOverrides: {
            root: { borderRadius: radii.control + 2 },
          },
        },

        MuiTooltip: {
          styleOverrides: {
            tooltip: { borderRadius: 8, fontSize: '0.75rem' },
          },
        },

        MuiLinearProgress: {
          styleOverrides: {
            root: { borderRadius: 4 },
          },
        },
      },
    },
    faIR,
  )
}

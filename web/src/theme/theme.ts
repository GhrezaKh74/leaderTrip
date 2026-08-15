import { createTheme, type Theme } from '@mui/material/styles'
import { faIR } from '@mui/material/locale'

/**
 * تم راست‌به‌چپ فارسی.
 *
 * سه چیز این‌جا با پیش‌فرض MUI فرق دارد و هر سه دلیل دارند:
 *
 * ۱. `direction: 'rtl'` تنها نصف کار است. نصف دیگرش کش استایل با
 *    `stylis-plugin-rtl` است که در `RtlProvider` نشسته — بدون آن، خودِ
 *    `margin-left` در CSS کامپوننت‌ها همان‌جا می‌ماند و چیدمان به‌هم می‌ریزد.
 *
 * ۲. قلم وزیرمتن است، نه Roboto. فارسی با قلم لاتین رندر می‌شود ولی ارقام و
 *    فاصله‌ها بد می‌افتند، و «ی» و «ک» عربی جای فارسی می‌نشینند.
 *
 * ۳. ارقام فارسی با `fontFeatureSettings` نمی‌آیند و نباید هم بیایند — تبدیل
 *    عدد کار لایهٔ نمایش است (`lib/format.ts`)، چون هر عددی نباید فارسی شود:
 *    عرض CSS و مقدار `input` باید لاتین بمانند وگرنه بی‌صدا از کار می‌افتند.
 *    این درسی است که در نسخهٔ اول با یک نوار پیشرفتِ همیشه‌پُر آموختیم.
 */

const brand = {
  main: '#0f766e',
  light: '#5eead4',
  dark: '#115e59',
}

const fontStack = [
  'Vazirmatn Variable',
  'Vazirmatn',
  'system-ui',
  '-apple-system',
  'Segoe UI',
  'sans-serif',
].join(', ')

export function buildTheme(mode: 'light' | 'dark'): Theme {
  return createTheme(
    {
      direction: 'rtl',
      palette: {
        mode,
        primary: brand,
        secondary: { main: mode === 'light' ? '#b45309' : '#fbbf24' },
        background:
          mode === 'light'
            ? { default: '#f8fafc', paper: '#ffffff' }
            : { default: '#0b1220', paper: '#111a2b' },
      },
      shape: { borderRadius: 12 },
      typography: {
        fontFamily: fontStack,
        // خط فارسی بلندتر از لاتین است؛ با ارتفاع خط پیش‌فرض، متن فشرده به نظر
        // می‌رسد و اِعراب و زیرنویس حروف به هم می‌چسبند.
        body1: { lineHeight: 1.9 },
        body2: { lineHeight: 1.8 },
        button: { fontWeight: 600, letterSpacing: 0 },
        h1: { fontSize: '2rem', fontWeight: 700 },
        h2: { fontSize: '1.6rem', fontWeight: 700 },
        h3: { fontSize: '1.3rem', fontWeight: 600 },
        h4: { fontSize: '1.15rem', fontWeight: 600 },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { WebkitFontSmoothing: 'antialiased' },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
        },
        MuiTextField: {
          defaultProps: { size: 'small', fullWidth: true },
        },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: ({ theme }) => ({
              border: `1px solid ${theme.palette.divider}`,
            }),
          },
        },
      },
    },
    faIR,
  )
}

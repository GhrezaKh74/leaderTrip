/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f5f7fa',
          100: '#e9edf3',
          200: '#cfd8e3',
          300: '#a8b7cb',
          400: '#7a8ea9',
          500: '#5a6d88',
          600: '#45566d',
          700: '#354458',
          800: '#232f3f',
          900: '#151d29',
          950: '#0b1119',
        },
        brand: {
          50: '#ecfdf6',
          100: '#d1fae7',
          200: '#a6f3d2',
          300: '#6ee7ba',
          400: '#34d39c',
          500: '#10b981',
          600: '#059468',
          700: '#047655',
          800: '#065f46',
          900: '#064e3b',
        },
        sand: {
          400: '#e0a458',
          500: '#d18f3c',
          600: '#b3722a',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,17,25,.06), 0 8px 24px -12px rgba(11,17,25,.18)',
      },
    },
  },
  plugins: [],
}

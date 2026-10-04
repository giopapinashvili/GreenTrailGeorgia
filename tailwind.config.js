/** @type {import('tailwindcss').Config} */
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        'surface-2': c('surface-2'),
        'surface-3': c('surface-3'),
        ink: c('ink'),
        'ink-2': c('ink-2'),
        'ink-3': c('ink-3'),
        line: c('line'),
        'line-2': c('line-2'),
        forest: c('forest'),
        'forest-2': c('forest-2'),
        'on-forest': c('on-forest'),
        moss: c('moss'),
        blaze: c('blaze'),
        sky: c('sky'),
        sand: c('sand'),
        easy: c('easy'),
        moderate: c('moderate'),
        hard: c('hard'),
        expert: c('expert'),
      },
      fontFamily: {
        sans: ['"Noto Sans Georgian Variable"', '"Noto Sans Georgian"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif Georgian Variable"', '"Noto Serif Georgian"', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 2px 8px rgb(0 0 0 / 0.04)',
        pop: '0 10px 30px rgb(0 0 0 / 0.12), 0 2px 6px rgb(0 0 0 / 0.06)',
      },
      maxWidth: {
        page: '1280px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        'slide-up': 'slide-up .25s ease-out',
      },
    },
  },
  plugins: [],
}

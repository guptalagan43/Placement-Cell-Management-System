/** @type {import('tailwindcss').Config} */
// Design tokens are the single source of truth from Docs/design.md §12 (colors,
// fontFamily, borderRadius) and §5 (elevation). Anything not listed there is a
// deliberate, documented extension: each semantic color adds a `DEFAULT` equal
// to its `text` value so `bg-danger`/`text-success` read naturally, and the
// two `boxShadow` tokens come straight from the §5 elevation table.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          600: '#146B34',
          700: '#15803D',
          900: '#0F5A28',
        },
        ink: {
          400: '#9CA3AF',
          600: '#4B5563',
          900: '#111827',
        },
        canvas: '#FAFAFA',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        success: { DEFAULT: '#15803D', text: '#15803D', bg: '#DCFCE7' },
        danger: { DEFAULT: '#DC2626', text: '#DC2626', bg: '#FEE2E2' },
        warning: { DEFAULT: '#D97706', text: '#D97706', bg: '#FEF3C7' },
        neutral: { DEFAULT: '#6B7280', text: '#6B7280', bg: '#F3F4F6' },
        info: { DEFAULT: '#2563EB', text: '#2563EB', bg: '#DBEAFE' },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
        md: '8px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 24, 39, 0.04)',
        raised: '0 8px 24px rgba(17, 24, 39, 0.08)',
      },
    },
  },
  plugins: [],
}

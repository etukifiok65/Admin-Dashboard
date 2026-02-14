/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
        },
        ink: {
          600: 'var(--ink-600)',
          900: 'var(--ink-900)',
        },
      },
    },
  },
  plugins: [],
}

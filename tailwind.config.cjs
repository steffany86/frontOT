/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#dae9ff',
          200: '#bcd6ff',
          300: '#8bb7ff',
          400: '#5890ff',
          500: '#2f6bff',
          600: '#1b4ee6',
          700: '#153dbc',
          800: '#153491',
          900: '#162e72',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}

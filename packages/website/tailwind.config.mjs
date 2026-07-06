/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'brand': {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      keyframes: {
        'gradient-drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(10px, -10px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' },
          '50%': { boxShadow: '0 0 50px rgba(99, 102, 241, 0.6)' },
        },
      },
      animation: {
        'gradient': 'gradient-drift 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'glow': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

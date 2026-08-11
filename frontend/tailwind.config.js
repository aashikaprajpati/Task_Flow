/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: '#F7F7F9',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#171A21',
          soft: '#676D7E',
          faint: '#9AA0AE',
        },
        border: '#E3E5EA',
        accent: {
          DEFAULT: '#4338EC',
          soft: '#EEEBFF',
          hover: '#372DD1',
        },
        status: {
          todo: '#8B90A0',
          todoSoft: '#F0F1F4',
          progress: '#F59E0B',
          progressSoft: '#FEF3DE',
          done: '#10B981',
          doneSoft: '#E3FAF0',
        },
        priority: {
          low: '#3F9E8F',
          lowSoft: '#E3F5F1',
          medium: '#DB9A2C',
          mediumSoft: '#FBF0DA',
          high: '#E0554A',
          highSoft: '#FBE7E5',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 26, 33, 0.06), 0 1px 1px rgba(23, 26, 33, 0.04)',
        floating: '0 12px 32px rgba(23, 26, 33, 0.14)',
        dragged: '0 18px 40px rgba(67, 56, 236, 0.22)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        popIn: { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.18s ease-out',
        popIn: 'popIn 0.15s ease-out',
      },
    },
  },
  plugins: [],
};

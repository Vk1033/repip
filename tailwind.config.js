/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tv: {
          bg: '#131722',
          surface: '#1e222d',
          border: '#2a2e39',
          bull: '#26a69a',
          bear: '#ef5350',
          text: '#d1d4dc',
          muted: '#787b86',
          primary: '#2962ff',
          hover: '#2a2e39'
        },
        fx: {
          canvas: '#e5e8ec',
          surface: '#ffffff',
          panel: '#f8fafc',
          border: '#cbd5e1',
          bull: '#8ea4c8',
          bear: '#334155',
          text: '#1e293b',
          muted: '#64748b',
          primary: '#2563eb',
          sell: '#ef4444',
          hover: '#e2e8f0'
        }
      }
    },
  },
  plugins: [],
};

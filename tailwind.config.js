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
        }
      }
    },
  },
  plugins: [],
};

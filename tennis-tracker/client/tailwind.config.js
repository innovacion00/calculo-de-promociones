/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        santiago: { DEFAULT: '#3266ad', light: '#E6F1FB' },
        nicole: { DEFAULT: '#D4537E', light: '#FBEAF0' },
        win: { DEFAULT: '#3B6D11', light: '#EAF3DE' },
        loss: { DEFAULT: '#A32D2D', light: '#FCEBEB' },
        pending: { DEFAULT: '#633806', light: '#FAEEDA' },
      },
    },
  },
  plugins: [],
};

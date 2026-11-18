/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#111215',
          850: '#16181D',
          800: '#1C1F26',
          700: '#252932',
          600: '#323743',
        },
        shield: {
          green: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B',
          blue: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Manrope', 'Poppins', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}

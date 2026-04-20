/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neo': {
          'yellow': '#f6de0d',
          'pink': '#ff41bb',
          'cyan': '#00d1ff',
          'green': '#85ff7a',
          'black': '#000000',
          'white': '#ffffff',
          'purple': '#8b5cf6',
        }
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-lg': '8px 8px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-sm': '2px 2px 0px 0px rgba(0, 0, 0, 1)',
      },
      fontFamily: {
        'arabic': ['Cairo', 'Tajawal', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}


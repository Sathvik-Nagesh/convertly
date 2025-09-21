/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'neo-pink': '#ff0055',
        'neo-cyan': '#00ccff',
        'neo-yellow': '#ffee00',
        'neo-white': '#ffffff',
        'neo-black': '#111111',
        'neo-gray': '#333333',
        'neo-dark': '#1a1a1a',
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
        'system': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '8px 8px 0px 0px #000000',
        'neo-xl': '12px 12px 0px 0px #000000',
        'neo-pink': '4px 4px 0px 0px #ff0055',
        'neo-cyan': '4px 4px 0px 0px #00ccff',
        'neo-yellow': '4px 4px 0px 0px #ffee00',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
      },
      animation: {
        'bounce-neo': 'bounce 0.5s ease-in-out',
        'pulse-neo': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}




/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      backgroundImage: {
        'breadboard': 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
      },
      backgroundSize: {
        'breadboard-size': '10px 10px',
      },
      colors: {
        'breadboard': '#d1d5db',
      },
      keyframes: {
        circuitTravel: {
          '0%': { 'stroke-dashoffset': '1000' },
          '100%': { 'stroke-dashoffset': '0' },
        },
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'circuit-line': 'circuitTravel 10s linear infinite',
      },
    },
  },
  plugins: [],
}


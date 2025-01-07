/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],

  theme: {
    extend: {
      colors: {
        'navy': {
          800: '#1a237e',
          900: '#0d1760',
        }
      }
    }
  },

  plugins: []
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/components/**/*.tsx', './src/pages/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'hero-background': "url('/images/hero.jpg')",
      },
      colors: {
        'flat-accent': '#0c6dc9',
        'flat-accent-dark': '#0a5ba8',
        'flat-border': '#e2e8f0',
        'flat-secondary': '#64748b',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

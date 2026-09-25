import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        // RideGrid premium design-system tokens (see app/globals.css :root).
        // Usable anywhere as bg-rg-surface, text-rg-text, border-rg-border, etc.
        rg: {
          black: 'var(--rg-black)',
          surface: 'var(--rg-surface)',
          'surface-2': 'var(--rg-surface-2)',
          'surface-3': 'var(--rg-surface-3)',
          border: 'var(--rg-border)',
          'border-strong': 'var(--rg-border-strong)',
          red: 'var(--rg-red)',
          'red-dark': 'var(--rg-red-dark)',
          'red-light': 'var(--rg-red-light)',
          ruby: 'var(--rg-ruby)',
          text: 'var(--rg-text)',
          'text-secondary': 'var(--rg-text-secondary)',
          'text-muted': 'var(--rg-text-muted)',
          'text-dim': 'var(--rg-text-dim)',
          success: 'var(--rg-success)',
          warning: 'var(--rg-warning)',
          danger: 'var(--rg-danger)',
          info: 'var(--rg-info)',
        },
      },
      boxShadow: {
        'rg-card': 'var(--rg-shadow-card)',
        'rg-glow': 'var(--rg-shadow-glow)',
      },
    },
  },
  plugins: [],
};
export default config;

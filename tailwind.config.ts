import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        primary: 'var(--brand-primary)',
        secondary: 'var(--brand-secondary)',
        accent: 'var(--brand-accent)',
        neutral: 'var(--brand-neutral)',
        muted: 'var(--brand-muted)',
        background: 'var(--brand-background)',
        border: 'var(--brand-border)',
        card: 'var(--brand-card)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium-sm': '0 4px 20px rgba(0,0,0,0.03)',
        'premium-md': '0 8px 30px rgba(0,0,0,0.05)',
        'premium-lg': '0 20px 50px rgba(0,0,0,0.08)',
        'premium-xl': '0 25px 60px rgba(0,0,0,0.12)',
      },
      transitionTimingFunction: {
        'premium-in': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'premium-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;

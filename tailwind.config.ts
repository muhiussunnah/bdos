import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        sidebar: 'var(--sidebar)',
        'sidebar-2': 'var(--sidebar-2)',
        ink: 'var(--text)',
        dim: 'var(--dim)',
        faint: 'var(--faint)',
        line: 'var(--border)',
        'line-2': 'var(--border-2)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        ok: 'var(--green)',
        warn: 'var(--amber)',
        bad: 'var(--red)',
        info: 'var(--blue)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: 'var(--radius)',
        lg: 'var(--radius-sm)',
      },
      boxShadow: {
        card: 'var(--shadow)',
        pop: 'var(--shadow-lg)',
      },
      keyframes: {
        reveal: {
          to: { opacity: '1', transform: 'none' },
        },
        pop: {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pulse2: {
          '0%': { boxShadow: '0 0 0 0 rgba(22,163,74,.5)' },
          '70%': { boxShadow: '0 0 0 7px rgba(22,163,74,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(22,163,74,0)' },
        },
        bob: {
          '0%,60%,100%': { transform: 'translateY(0)', opacity: '.4' },
          '30%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        reveal: 'reveal .5s cubic-bezier(.2,.7,.3,1) forwards',
        pop: 'pop .16s ease',
        pulse2: 'pulse2 2s infinite',
        bob: 'bob 1.2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;

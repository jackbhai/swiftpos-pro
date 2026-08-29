/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amoled: '#000000',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface2) / <alpha-value>)',
        surface3: 'rgb(var(--surface3) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        ink2: 'rgb(var(--ink2) / <alpha-value>)',
        ink3: 'rgb(var(--ink3) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        brand2: 'rgb(var(--brand2) / <alpha-value>)',
        ok: '#10b981',
        warn: '#f59e0b',
        bad: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--brand)/0.4), 0 0 24px -4px rgb(var(--brand)/0.45)',
        'glow-lg': '0 0 0 1px rgb(var(--brand)/0.5), 0 0 36px -4px rgb(var(--brand)/0.65)',
        'glow-ok': '0 0 0 1px rgba(16, 185, 129, 0.4), 0 0 24px -4px rgba(16, 185, 129, 0.45)',
        'glow-warn': '0 0 0 1px rgba(245, 158, 11, 0.4), 0 0 24px -4px rgba(245, 158, 11, 0.45)',
        'glow-bad': '0 0 0 1px rgba(239, 68, 68, 0.4), 0 0 24px -4px rgba(239, 68, 68, 0.45)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgb(var(--line))',
        floating: '0 12px 40px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgb(var(--line))',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        slideup: { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slidedown: { '0%': { transform: 'translateY(-16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        pop: 'pop .18s cubic-bezier(0.16, 1, 0.3, 1)',
        slideup: 'slideup .22s cubic-bezier(0.16, 1, 0.3, 1)',
        slidedown: 'slidedown .22s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        shimmer: 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [],
};

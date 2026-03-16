import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue-50': '#eff6ff',
        'brand-blue-100': '#dbeafe',
        'brand-blue-200': '#bfdbfe',
        'brand-blue-400': '#60a5fa',
        'brand-blue-500': '#3b82f6',
        'brand-blue-600': '#2563eb',
        'brand-blue-700': '#1d4ed8',
        'brand-blue-900': '#1e3a8a',
        'brand-green': '#10b981',
        'brand-red': '#ef4444',
        'brand-amber': '#f59e0b',
      },
      fontFamily: {
        geist: ['Geist', 'system-ui', 'sans-serif'],
        bricolage: ['Bricolage Grotesque', 'sans-serif'],
        'dm-serif': ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'sm-custom': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'custom': '0 4px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
        'lg-custom': '0 16px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'custom': '12px',
      },
      animation: {
        'blink': 'blink 2s infinite',
        'blink-fast': 'blink 1.5s infinite',
        'wav': 'wav 1s infinite',
        'tick': 'tick 30s linear infinite',
        'pulsePin': 'pulsePin 2s infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        wav: {
          '0%, 100%': { height: '5px' },
          '50%': { height: '16px' },
        },
        tick: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        pulsePin: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.25)' },
        },
      },
    },
  },
  plugins: [],
}

export default config

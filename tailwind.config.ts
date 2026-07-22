import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      /* ========================================================
         TYPOGRAPHY — Font Families (TripTide + Portly)
         ======================================================== */
      fontFamily: {
        /* Brand & Display — Syne (TripTide) + Clash Display (Portly fallback) */
        brand: ['Syne', 'Clash Display', 'system-ui', 'sans-serif'],
        display: ['Syne', 'Clash Display', 'system-ui', 'sans-serif'],
        heading: ['Syne', 'Clash Display', 'system-ui', 'sans-serif'],

        /* Interface & Controls — Plus Jakarta Sans (TripTide) */
        interface: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        ui: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],

        /* Tabular Data — JetBrains Mono (TripTide) + Geist Mono (Portly) */
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
        tabular: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
        numeric: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
      },

      /* ========================================================
         TYPOGRAPHY — Font Size Scale (Major Third: 1.250)
         ======================================================== */
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.04em' }],  /* 10px — overline */
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],           /* 12px — captions */
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],       /* 14px — body small */
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em' }],             /* 16px — body */
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],      /* 18px */
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],       /* 20px */
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],        /* 24px */
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],   /* 30px */
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],     /* 36px */
        '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.02em' }],       /* 48px */
        '6xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.02em' }],       /* 60px */
        '7xl': ['4.5rem', { lineHeight: '4.75rem', letterSpacing: '-0.02em' }],     /* 72px */
        '8xl': ['6rem', { lineHeight: '6.25rem', letterSpacing: '-0.03em' }],       /* 96px */
        '9xl': ['8rem', { lineHeight: '8.25rem', letterSpacing: '-0.03em' }],       /* 128px */

        /* Brutalist oversized locks — clamp-based, tight leading */
        'brutal-hero': ['clamp(3rem, 8vw, 8rem)', { lineHeight: '0.92', letterSpacing: '-0.04em', fontWeight: '700' }],
        'brutal-heading': ['clamp(2rem, 5vw, 4rem)', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '700' }],
        'brutal-subhead': ['clamp(1.25rem, 3vw, 2rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        'brutal-mono': ['clamp(1.5rem, 4vw, 3rem)', { lineHeight: '1', letterSpacing: '-0.01em', fontWeight: '700' }],
        'brutal-label': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.15em', fontWeight: '700' }],
      },

      /* ========================================================
         COLOR — TripTide Light Theme (Primary) + Portly Dark Theme
         ======================================================== */
      colors: {
        /* ─── TripTide Light Theme (Default) ─── */
        canvas: '#f8f9fa',
        ink: '#12131a',
        'ink-soft': '#4a4c59',
        'ink-faint': '#8b8d9a',

        indigo: '#2a44e7',
        'indigo-dark': '#1c2fa8',
        'indigo-mist': '#eef0fd',

        mint: '#a9f3e0',
        'mint-ink': '#0b6b57',
        'mint-soft': '#eafdf8',

        coral: '#f2a65a',
        'coral-ink': '#8a4e0f',
        'coral-soft': '#fdf1e3',

        /* ─── Portly Dark Theme (Dark Mode) ─── */
        obsidian: {
          50: '#f8f9fa',
          100: '#e9eaed',
          200: '#cdcfd6',
          300: '#a2a6b3',
          400: '#777d8f',
          500: '#555b6e',
          600: '#3d4356',
          700: '#2a2f3f',
          800: '#1a1d2b',
          900: '#0f1119',
          950: '#07080e',
        },

        /* Neon Accents (Portly) */
        'neon-teal': {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },

        'neon-mint': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        'neon-coral': {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },

        'neon-amber': {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        'neon-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },

      /* ========================================================
         SEMANTIC COLOR ALIASES — Light Theme (Default)
         ======================================================== */
      backgroundColor: {
        base: '#f8f9fa',
        surface: '#ffffff',
        elevated: '#f8f9fa',
        overlay: '#eef0fd',
        inverse: '#12131a',
        primary: '#2a44e7',
        'primary-hover': '#1c2fa8',
        secondary: '#eef0fd',
        'secondary-hover': '#dce0fb',
      },

      textColor: {
        primary: '#12131a',
        secondary: '#4a4c59',
        tertiary: '#8b8d9a',
        inverse: '#f8f9fa',
        link: '#2a44e7',
        'link-hover': '#1c2fa8',
      },

      borderColor: {
        subtle: '#e0e2eb',
        default: '#d0d3e0',
        strong: '#a0a4b8',
        accent: '#2a44e7',
        focus: '#2a44e7',
      },

      /* ========================================================
         DARK MODE SEMANTIC OVERRIDES (Portly)
         ======================================================== */
      // These will be applied via @media (prefers-color-scheme: dark) or .dark class

      /* ========================================================
         BORDER RADIUS
         ======================================================== */
      borderRadius: {
        '2xs': '0.125rem',  /* 2px */
        xs: '0.25rem',      /* 4px */
        sm: '0.375rem',     /* 6px */
        md: '0.5rem',       /* 8px */
        lg: '0.75rem',      /* 12px */
        xl: '1rem',         /* 16px */
        '2xl': '1.5rem',    /* 24px */
        '3xl': '2rem',      /* 32px */
      },

      /* ========================================================
         BOX SHADOW — TripTide soft shadows + Portly dark theme shadows
         ======================================================== */
      boxShadow: {
        // TripTide light theme shadows
        float: '0 24px 48px -12px rgba(18, 19, 26, 0.06), 0 4px 12px -4px rgba(18, 19, 26, 0.04)',
        'float-lg': '0 32px 64px -16px rgba(18, 19, 26, 0.08), 0 8px 20px -6px rgba(18, 19, 26, 0.05)',

        // Portly dark theme shadows
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)',
        'glow-teal': '0 0 20px rgba(6, 182, 212, 0.15), 0 0 40px rgba(6, 182, 212, 0.08)',
        'glow-coral': '0 0 20px rgba(244, 63, 94, 0.15), 0 0 40px rgba(244, 63, 94, 0.08)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.15), 0 0 40px rgba(245, 158, 11, 0.08)',
        'glow-mint': '0 0 20px rgba(34, 197, 94, 0.15), 0 0 40px rgba(34, 197, 94, 0.08)',
        // Brutalist hard shadows — offset, zero blur
        'hard-sm': '4px 4px 0 0 rgba(6, 182, 212, 0.3)',
        'hard-md': '6px 6px 0 0 rgba(6, 182, 212, 0.25)',
        'hard-lg': '8px 8px 0 0 rgba(6, 182, 212, 0.2)',
        'hard-coral': '6px 6px 0 0 rgba(244, 63, 94, 0.25)',
        'hard-amber': '6px 6px 0 0 rgba(245, 158, 11, 0.25)',
        'hard-mint': '6px 6px 0 0 rgba(34, 197, 94, 0.25)',
      },

      /* ========================================================
         ANIMATION — Existing + Brutalist entrance animations
         ======================================================== */
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'price-flash': 'priceFlash 0.5s ease-out',
        'count-up': 'countUp 0.6s ease-out',
        skeleton: 'skeleton 1.5s ease-in-out infinite',
        /* Brutalist entrance animations */
        'hard-reveal': 'hardReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'hard-slide-up': 'hardSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'hard-slide-right': 'hardSlideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'stagger-fade': 'staggerFade 0.4s ease-out forwards',
        'border-draw': 'borderDraw 0.8s ease-out forwards',
        'glitch-in': 'glitchIn 0.5s steps(3) forwards',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(6, 182, 212, 0.25)' },
        },
        priceFlash: {
          '0%': { backgroundColor: 'rgba(6, 182, 212, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        countUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        skeleton: {
          '0%': { opacity: '0.5' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.5' },
        },
        /* Brutalist keyframes */
        hardReveal: {
          '0%': { clipPath: 'inset(0 100% 0 0)', opacity: '0' },
          '100%': { clipPath: 'inset(0 0 0 0)', opacity: '1' },
        },
        hardSlideUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        hardSlideRight: {
          '0%': { transform: 'translateX(-40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        staggerFade: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        borderDraw: {
          '0%': { borderColor: 'transparent', boxShadow: 'none' },
          '100%': { borderColor: 'rgba(6, 182, 212, 0.5)', boxShadow: '6px 6px 0 0 rgba(6, 182, 212, 0.25)' },
        },
        glitchIn: {
          '0%': { transform: 'translate(-2px, 0) skew(0deg)', opacity: '0.7' },
          '33%': { transform: 'translate(2px, -1px) skew(2deg)', opacity: '0.9' },
          '66%': { transform: 'translate(-1px, 1px) skew(-1deg)', opacity: '0.8' },
          '100%': { transform: 'translate(0, 0) skew(0deg)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'chart-container',
    'chart-svg',
  ],
};

export default config;
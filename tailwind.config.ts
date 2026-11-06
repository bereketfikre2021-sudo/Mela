import type { Config } from 'tailwindcss'

/**
 * MELA design tokens.
 * Colors and fonts are defined as CSS variables in src/index.css and mapped
 * here so both Tailwind utilities and raw CSS variables share one source of
 * truth. The type scale below is the single intentional type scale used across
 * the product.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        // Body-sized secondary copy; meets WCAG AA on background and surface.
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        // Reserved for non-text and larger decorative uses (icons, dots, placeholders).
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          interactive: 'rgb(var(--color-primary-interactive) / <alpha-value>)',
          soft: 'rgb(var(--color-primary-soft) / <alpha-value>)'
        },
        success: { DEFAULT: 'rgb(var(--color-success) / <alpha-value>)', soft: 'rgb(var(--color-success-soft) / <alpha-value>)' },
        warning: { DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)', soft: 'rgb(var(--color-warning-soft) / <alpha-value>)' },
        danger: { DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)', soft: 'rgb(var(--color-danger-soft) / <alpha-value>)' },
        info: { DEFAULT: 'rgb(var(--color-info) / <alpha-value>)', soft: 'rgb(var(--color-info-soft) / <alpha-value>)' }
      },
      borderColor: {
        DEFAULT: 'rgb(var(--color-border) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['var(--font-sans)']
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }]
      },
      borderRadius: {
        xs: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.75rem'
      },
      boxShadow: {
        // A single restrained elevation token, used only for elements that must
        // lift off the surface (dialogs, toasts).
        layer: '0 8px 28px -10px rgba(37, 42, 39, 0.18), 0 2px 8px -3px rgba(37, 42, 39, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config

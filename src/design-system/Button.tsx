import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:     Variant
  size?:        Size
  loading?:     boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?:   boolean
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl ' +
  'transition-all duration-150 select-none active:scale-[0.97] ' +
  'disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1'

const variants: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-interactive shadow-sm hover:shadow-md',
  secondary: 'bg-primary-soft text-primary hover:bg-primary-soft/80 border border-primary/10',
  ghost:     'text-text hover:bg-text/[0.06] border border-transparent hover:border-border',
  danger:    'bg-danger text-white hover:bg-danger/90 shadow-sm',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  )
})

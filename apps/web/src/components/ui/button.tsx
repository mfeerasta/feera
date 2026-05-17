import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost' | 'inverted' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'feera-motion inline-flex items-center justify-center font-normal rounded-none focus-visible:outline-none focus-visible:outline-1 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  /** Default: themed border + fg + subtle accent fill on hover. */
  primary:
    'border border-[color:var(--color-fg)] text-[color:var(--color-fg)] bg-transparent hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/5',
  /** Underline-on-hover, no border. */
  ghost:
    'text-[color:var(--color-fg)] bg-transparent hover:text-[color:var(--color-accent)] hover:underline underline-offset-4',
  /** Inverted variant: explicit dark text on light surfaces inside a dark page. */
  inverted:
    'border border-ink-deep text-ink-deep bg-transparent hover:border-court hover:text-court hover:bg-court/5',
  /** Destructive. */
  danger:
    'border border-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-cream',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs tracking-wide',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

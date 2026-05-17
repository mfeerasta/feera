import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost' | 'inverted' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center font-normal rounded-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-court focus-visible:ring-offset-2 focus-visible:ring-offset-ink-deep disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  /** Default for dark surfaces: cream border + cream text + court on hover. */
  primary:
    'border border-cream text-cream bg-transparent hover:border-court hover:text-court',
  /** Underline-on-hover, no border. */
  ghost:
    'text-cream bg-transparent hover:text-court hover:underline underline-offset-4',
  /** For light surfaces: ink border + ink text + court on hover. */
  inverted:
    'border border-ink-deep text-ink-deep bg-transparent hover:border-court hover:text-court',
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

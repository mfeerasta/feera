import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Sharp-corner input. Adapts via surrounding text colour: defaults to
 * ink-on-paper. On dark surfaces, pass `border-cream/40 text-cream`.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-11 w-full rounded-none border border-ink-deep/30 bg-transparent px-4 text-sm text-ink-deep',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:border-court',
        'disabled:opacity-50 disabled:pointer-events-none placeholder:text-ink-deep/40',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

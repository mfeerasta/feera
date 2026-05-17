import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Sharp-corner input. Theme-aware via semantic vars. Override per-instance
 * if a specific surface needs a tighter border.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'feera-motion h-11 w-full rounded-none border border-[color:var(--color-border)] bg-transparent px-4 text-sm text-[color:var(--color-fg)]',
        'focus-visible:outline-none focus-visible:border-[color:var(--color-accent)]',
        'disabled:opacity-50 disabled:pointer-events-none placeholder:text-[color:var(--color-fg-muted)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

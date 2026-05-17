import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-10 w-full rounded-md border border-feera-court/20 bg-white px-3 text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-feera-court',
        'disabled:opacity-50 disabled:pointer-events-none placeholder:text-neutral-400',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

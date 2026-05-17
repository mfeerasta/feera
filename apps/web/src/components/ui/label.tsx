import * as React from 'react';
import { cn } from '@/lib/cn';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/** Tracked uppercase eyebrow per ADR-0010. Theme-aware. */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

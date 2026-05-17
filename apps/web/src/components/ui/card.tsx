import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Hairline card per ADR-0010. No shadow, no radius.
 * Surface adapts: on cream backgrounds use ink hairlines; on dark, cream/15.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border border-ink-deep/15 bg-paper rounded-none',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-b border-ink-deep/10 px-6 py-5', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'font-serif text-xl tracking-tight text-ink-deep',
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t border-ink-deep/10 px-6 py-4 text-sm text-ink-deep/70',
        className,
      )}
      {...props}
    />
  );
}

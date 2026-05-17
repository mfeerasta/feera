import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Hairline card per ADR-0010. No shadow, no radius. Theme-aware via
 * semantic CSS variables: surface is bg-card, hairlines use border.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'feera-motion border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] rounded-none',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-b border-[color:var(--color-border)] px-6 py-5', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'font-serif text-xl tracking-tight text-[color:var(--color-fg)]',
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
        'border-t border-[color:var(--color-border)] px-6 py-4 text-sm text-[color:var(--color-fg-muted)]',
        className,
      )}
      {...props}
    />
  );
}

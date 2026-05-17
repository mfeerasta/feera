import * as React from 'react';
import { cn } from '@/lib/cn';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full text-sm text-[color:var(--color-fg)]', className)}
        {...props}
      />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className="border-b border-[color:var(--color-border)] text-left"
      {...props}
    />
  );
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-[color:var(--color-border)]" {...props} />;
}

export function TR(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className="feera-motion hover:bg-[color:var(--color-bg-fold)]"
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-5 py-4 text-xs font-normal uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-5 py-4 align-middle', className)} {...props} />;
}

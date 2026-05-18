import type { Metadata } from 'next';
import SwaggerUiClient from './swagger-ui.client';

export const metadata: Metadata = {
  title: 'Feera API reference',
  description: 'Interactive OpenAPI 3.1 reference for the Feera REST surface.',
};

export const dynamic = 'force-static';
export const revalidate = 3600;

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)] px-8 py-10">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          Reference
        </p>
        <h1 className="feera-motion mt-2 font-serif text-3xl tracking-tight">
          Feera API
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
          OpenAPI 3.1 spec generated directly from the runtime Zod validators.
          Download as <a className="underline" href="/api/openapi.json">JSON</a>{' '}
          or <a className="underline" href="/api/openapi.yaml">YAML</a>.
        </p>
      </header>
      <section className="px-2 py-6 sm:px-8">
        <SwaggerUiClient specUrl="/api/openapi.json" />
      </section>
    </main>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

// Swagger UI ships a large bundle. Lazy import on the client so SSR is not
// touched and the marketing build stays small.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

interface Props {
  specUrl: string;
}

export default function SwaggerUiClient({ specUrl }: Props) {
  useEffect(() => {
    // Inject the swagger-ui base stylesheet from a CDN so we do not have to
    // wire it through the Next CSS pipeline (which rejects raw .css imports
    // from node_modules without dedicated config).
    const id = 'swagger-ui-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-react@5/swagger-ui.css';
    document.head.appendChild(link);
  }, []);

  return (
    <div className="feera-swagger">
      <style>{`
        .feera-swagger { background: var(--color-bg); color: var(--color-fg); }
        .feera-swagger .swagger-ui,
        .feera-swagger .swagger-ui .info .title,
        .feera-swagger .swagger-ui .opblock-tag,
        .feera-swagger .swagger-ui .opblock .opblock-summary-path,
        .feera-swagger .swagger-ui .opblock .opblock-summary-description {
          color: var(--color-fg);
          font-family: var(--font-serif, ui-serif, Georgia, serif);
        }
        .feera-swagger .swagger-ui .opblock,
        .feera-swagger .swagger-ui .scheme-container,
        .feera-swagger .swagger-ui section.models {
          background: transparent;
          border-color: var(--color-border);
          border-radius: 0;
          box-shadow: none;
        }
        .feera-swagger .swagger-ui .opblock .opblock-summary {
          border-color: var(--color-border);
          border-radius: 0;
        }
        .feera-swagger .swagger-ui .btn,
        .feera-swagger .swagger-ui input,
        .feera-swagger .swagger-ui select,
        .feera-swagger .swagger-ui textarea {
          border-radius: 0;
        }
      `}</style>
      <SwaggerUI url={specUrl} docExpansion="list" defaultModelsExpandDepth={0} />
    </div>
  );
}

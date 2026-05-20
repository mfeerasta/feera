'use client';

import { useState } from 'react';

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      onClick={copy}
      type="button"
      className="inline-flex w-fit items-center justify-center border border-ink-deep bg-transparent px-6 py-3 text-sm text-ink-deep transition-colors duration-150 hover:border-court hover:text-court"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

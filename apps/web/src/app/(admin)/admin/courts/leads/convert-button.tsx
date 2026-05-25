'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ConvertButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConvert() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/courts/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      if (res.ok) {
        router.push('/admin/courts/pipeline');
      } else {
        const json = await res.json().catch(() => null);
        alert(json?.message ?? 'Failed to convert lead.');
        setLoading(false);
      }
    } catch {
      alert('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <Button
      variant="inverted"
      size="sm"
      disabled={loading}
      onClick={handleConvert}
    >
      {loading ? 'Converting...' : 'Convert to deal'}
    </Button>
  );
}

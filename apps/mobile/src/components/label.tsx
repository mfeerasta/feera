import type { ReactNode } from 'react';
import { Text } from 'react-native';

export function Label({ children }: { children: ReactNode }) {
  return (
    <Text className="text-[10px] tracking-[2px] uppercase text-ink-deep/60">
      {children}
    </Text>
  );
}

export function Heading({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <Text className={`font-serif text-4xl ${light ? 'text-cream' : 'text-ink-deep'}`}>
      {children}
    </Text>
  );
}

export function Subhead({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <Text className={`text-base ${light ? 'text-cream/70' : 'text-ink-deep/70'}`}>
      {children}
    </Text>
  );
}

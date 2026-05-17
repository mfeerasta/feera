import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'paper' | 'ink';
  className?: string;
}

const VARIANT = {
  paper: 'bg-paper border-ink-deep/15',
  ink: 'bg-ink-card border-cream/15',
} as const;

export function Card({ children, onPress, variant = 'paper', className }: CardProps) {
  const cls = `border ${VARIANT[variant]} p-5 gap-2 ${className ?? ''}`;
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className={cls}>
        {children}
      </Pressable>
    );
  }
  return <View className={cls}>{children}</View>;
}

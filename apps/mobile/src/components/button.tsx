import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'brass';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const BASE = 'items-center justify-center border';
const SIZE = { sm: 'py-2.5 px-4', md: 'py-4 px-5' };

const VARIANT = {
  primary: 'bg-court border-court',
  outline: 'border-ink-deep bg-transparent',
  ghost: 'border-transparent bg-transparent',
  brass: 'border-brass bg-transparent',
} as const;

const TEXT_VARIANT = {
  primary: 'text-cream',
  outline: 'text-ink-deep',
  ghost: 'text-ink-deep',
  brass: 'text-brass',
} as const;

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      className={`${BASE} ${SIZE[size]} ${VARIANT[variant]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#F6F3EE' : '#071C14'} />
      ) : typeof children === 'string' ? (
        <Text className={`text-sm ${TEXT_VARIANT[variant]}`}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

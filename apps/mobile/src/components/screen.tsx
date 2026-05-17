import type { ReactNode } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface ScreenProps {
  children: ReactNode;
  /** 'ink' = dark forest, 'cream' = light background, 'paper' = white. */
  variant?: 'ink' | 'cream' | 'paper';
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}

const VARIANT_BG = {
  ink: 'bg-ink-deep',
  cream: 'bg-cream',
  paper: 'bg-paper',
} as const;

const VARIANT_STATUS = {
  ink: 'light',
  cream: 'dark',
  paper: 'dark',
} as const;

export function Screen({
  children,
  variant = 'cream',
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
}: ScreenProps) {
  const bg = VARIANT_BG[variant];
  const inner = padded ? 'px-6 pt-4 pb-12 gap-4' : '';
  const body = scroll ? (
    <ScrollView
      contentContainerClassName={inner}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={variant === 'ink' ? '#F6F3EE' : '#071C14'}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 ${inner}`}>{children}</View>
  );

  return (
    <SafeAreaView className={`flex-1 ${bg}`} edges={['top', 'left', 'right']}>
      <StatusBar style={VARIANT_STATUS[variant]} />
      {body}
    </SafeAreaView>
  );
}

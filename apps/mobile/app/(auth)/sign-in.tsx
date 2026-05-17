import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '../../src/components/screen';
import { Input } from '../../src/components/input';
import { Label, Heading } from '../../src/components/label';
import { Button } from '../../src/components/button';
import { authClient } from '../../src/auth/client';
import { apiFetch, ApiError } from '../../src/lib/api';

type Step = 'phone' | 'otp';

interface DevOtpResponse {
  data?: { otp?: string };
}

export default function SignInScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  async function fetchDevOtp(forPhone: string): Promise<void> {
    if (!__DEV__) return;
    try {
      const json = await apiFetch<DevOtpResponse>(
        `/api/auth/phone-number/dev-last-otp?phoneNumber=${encodeURIComponent(forPhone)}`,
      );
      if (json?.data?.otp) setDevOtp(json.data.otp);
    } catch {
      // dev helper, ignore.
    }
  }

  async function sendCode() {
    if (!phone.trim()) {
      setError('Enter a phone number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.phoneNumber.sendOtp({ phoneNumber: phone.trim() });
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error(
          (res as { error: { message?: string } }).error.message ?? 'Failed to send code',
        );
      }
      setStep('otp');
      await fetchDevOtp(phone.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (code.length < 4) {
      setError('Enter the code from your messages.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.phoneNumber.verify({
        phoneNumber: phone.trim(),
        code: code.trim(),
      });
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error(
          (res as { error: { message?: string } }).error.message ?? 'Invalid code',
        );
      }
      // _layout.tsx AuthGate redirects to /(tabs)/home when session lands.
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`${e.status}: ${typeof e.body === 'string' ? e.body : 'Verification failed.'}`);
      } else {
        setError(e instanceof Error ? e.message : 'Could not verify code.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen variant="ink">
      <View className="gap-3 mt-12">
        <Label>{t('brand.wordmark')}</Label>
        <Heading light>{t('auth.signIn')}</Heading>
        <Text className="text-base text-cream/70">{t('auth.signInSubtitle')}</Text>
      </View>

      {step === 'phone' ? (
        <View className="gap-4 mt-8">
          <Label>Phone</Label>
          <Input
            placeholder="+92 300 1234567"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
            className="bg-cream"
          />
          <Button onPress={sendCode} loading={busy}>{t('auth.continue')}</Button>
        </View>
      ) : (
        <View className="gap-4 mt-8">
          <Label>One-time code</Label>
          <Input
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            className="bg-cream tracking-[8px] text-center text-2xl"
          />
          <Button onPress={verifyCode} loading={busy}>Verify</Button>
          <Pressable
            onPress={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
          >
            <Text className="text-cream/60 text-center text-sm">Use a different number</Text>
          </Pressable>
        </View>
      )}

      {error ? (
        <View className="mt-6 border border-red-400/60 bg-red-950/30 p-3">
          <Text className="text-red-200 text-sm">{error}</Text>
        </View>
      ) : null}

      {__DEV__ && devOtp ? (
        <View className="mt-6 border border-brass/60 bg-brass/10 p-3">
          <Text className="text-brass text-xs uppercase tracking-[2px]">Dev OTP</Text>
          <Text className="text-cream text-2xl font-serif">{devOtp}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

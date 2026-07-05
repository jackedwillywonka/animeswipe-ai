import React, { useCallback, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenModule from 'expo-splash-screen';
import { useFonts as useSora, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useFonts as useInter, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { SplashScreen } from '@/screens/SplashScreen';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AppProvider, useAppContext } from '@/state/AppContext';
import { upsertPreferences } from '@/services/animeRepository';
import { colors } from '@/theme/tokens';
import type { UserPreferences } from '@/types';

SplashScreenModule.preventAutoHideAsync();

function AppInner() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { userId, setPreferences } = useAppContext();

  // TODO: wire to Supabase Auth (see src/services/supabase.ts).
  // These handlers currently just flip local state so the flow is
  // demonstrable before real auth is connected.
  function handleLogin() {
    setIsAuthenticated(true);
  }

  function handleOnboardingComplete(preferences: UserPreferences) {
    setPreferences(preferences);
    upsertPreferences(userId, preferences).catch((e) =>
      console.warn('[onboarding] failed to persist preferences', e)
    );
    setHasCompletedOnboarding(true);
  }

  return (
    <RootNavigator
      isAuthenticated={isAuthenticated}
      hasCompletedOnboarding={hasCompletedOnboarding}
      onLoginGoogle={handleLogin}
      onLoginApple={handleLogin}
      onLoginEmail={handleLogin}
      onOnboardingComplete={handleOnboardingComplete}
    />
  );
}

export default function App() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const [soraLoaded] = useSora({ Sora_600SemiBold, Sora_700Bold });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium });
  const fontsLoaded = soraLoaded && interLoaded;

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreenModule.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (showCustomSplash) {
    return <SplashScreen onFinished={() => setShowCustomSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <AppProvider>
        <AppInner />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

import React, { useCallback, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenModule from 'expo-splash-screen';
import { useFonts as useSora, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useFonts as useInter, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { SplashScreen } from '@/screens/SplashScreen';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AppProvider } from '@/state/AppContext';
import { AiSessionProvider } from '@/state/AiSessionContext';
import { colors } from '@/theme/tokens';

SplashScreenModule.preventAutoHideAsync();

function AppInner() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  function handleLogin() {
    setIsAuthenticated(true);
  }

  return (
    <RootNavigator
      isAuthenticated={isAuthenticated}
      onLoginGoogle={handleLogin}
      onLoginApple={handleLogin}
      onLoginEmail={handleLogin}
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
        <AiSessionProvider>
          <AppInner />
        </AiSessionProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

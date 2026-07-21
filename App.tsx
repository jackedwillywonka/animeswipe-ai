import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenModule from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useFonts as useSora, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useFonts as useInter, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import type { Session } from '@supabase/supabase-js';
import { SplashScreen } from '@/screens/SplashScreen';
import { EmailAuthScreen } from '@/screens/EmailAuthScreen';
import { ChooseUsernameScreen } from '@/screens/ChooseUsernameScreen';
import { getUsername } from '@/services/usernameService';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Analytics } from '@vercel/analytics/react';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AppProvider } from '@/state/AppContext';
import { AiSessionProvider } from '@/state/AiSessionContext';
import {
  getCurrentSession,
  onAuthStateChange,
  signInWithGoogle,
} from '@/services/authService';
import { colors } from '@/theme/tokens';

SplashScreenModule.preventAutoHideAsync();

function AppInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [emailAuthOpen, setEmailAuthOpen] = useState(false);
  const [needsUsername, setNeedsUsername] = useState<boolean | null>(null);

  // After login, check whether this user has picked a username yet.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setNeedsUsername(null);
      return;
    }
    let cancelled = false;
    getUsername(uid).then((u) => {
      if (!cancelled) setNeedsUsername(!u);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // On launch: restore any saved session, then listen for login/logout.
  useEffect(() => {
    getCurrentSession().then((s) => {
      setSession(s);
      setAuthChecked(true);
    });
    const unsubscribe = onAuthStateChange(setSession);
    return unsubscribe;
  }, []);

  // Wait until we know whether the user is already logged in
  // (prevents a login-screen flash for returning users).
  if (!authChecked) return null;

  if (emailAuthOpen && !session) {
    return (
      <SafeAreaProvider>
        <EmailAuthScreen
          onBack={() => setEmailAuthOpen(false)}
          onAuthenticated={() => setEmailAuthOpen(false)}
        />
      </SafeAreaProvider>
    );
  }

  if (session && needsUsername) {
    return (
      <SafeAreaProvider>
        <ChooseUsernameScreen
          userId={session.user.id}
          onDone={() => setNeedsUsername(false)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <>
      <RootNavigator
        isAuthenticated={!!session}
        onLoginGoogle={async () => {
          try {
            await signInWithGoogle();
          } catch (e) {
            console.warn('[auth] Google sign-in failed:', e);
          }
        }}
        onLoginApple={() => {}}
        onLoginEmail={() => setEmailAuthOpen(true)}
      />
      {Platform.OS === 'web' && <Analytics />}
    </>
  );
}

export default function App() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const [soraLoaded] = useSora({ Sora_600SemiBold, Sora_700Bold });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium });
  const [iconsLoaded] = useFonts(Ionicons.font);
  const fontsLoaded = soraLoaded && interLoaded && iconsLoaded;

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

  const appTree = (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <AppProvider>
        <AiSessionProvider>
          <AppInner />
        </AiSessionProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );

  // On web, present the app in a centered phone-width frame so desktop
  // visitors see a clean mobile layout instead of a stretched one.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480 }}>{appTree}</View>
      </View>
    );
  }

  return appTree;
}

import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { AnimeDetailsScreen } from '@/screens/AnimeDetailsScreen';
import { FilterScreen } from '@/screens/FilterScreen';
import { MainTabs } from './MainTabs';
import { colors } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import { getAnimeById as getMockAnimeById } from '@/services/animeRepository';
import { scoreAnime, buildInitialWeights } from '@/services/recommendationEngine';
import type { UserPreferences } from '@/types';

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Main: undefined;
  Details: { animeId: string };
  Filters: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    primary: colors.violetCore,
  },
};

interface RootNavigatorProps {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  onLoginGoogle: () => void;
  onLoginApple: () => void;
  onLoginEmail: () => void;
  onOnboardingComplete: (preferences: UserPreferences) => void;
}

export function RootNavigator({
  isAuthenticated,
  hasCompletedOnboarding,
  onLoginGoogle,
  onLoginApple,
  onLoginEmail,
  onOnboardingComplete,
}: RootNavigatorProps) {
  const { preferences, savedAnimeIds, toggleSaved } = useAppContext();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login">
            {() => (
              <LoginScreen
                onLoginGoogle={onLoginGoogle}
                onLoginApple={onLoginApple}
                onLoginEmail={onLoginEmail}
              />
            )}
          </Stack.Screen>
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={onOnboardingComplete} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Details"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            >
              {({ navigation, route }) => {
                const anime = getMockAnimeById(route.params.animeId);
                if (!anime) return null;
                const weights = buildInitialWeights(preferences);
                const match = scoreAnime(anime, weights);
                return (
                  <AnimeDetailsScreen
                    anime={anime}
                    match={match}
                    preferences={preferences}
                    onBack={() => navigation.goBack()}
                    onSelectSimilar={(similar) =>
                      navigation.push('Details', { animeId: similar.id })
                    }
                    isSaved={savedAnimeIds.has(anime.id)}
                    onToggleSave={() => toggleSaved(anime.id)}
                  />
                );
              }}
            </Stack.Screen>
            <Stack.Screen name="Filters" options={{ presentation: 'modal' }}>
              {({ navigation }) => (
                <FilterScreen
                  initialFilters={{}}
                  onApply={() => navigation.goBack()}
                  onClose={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

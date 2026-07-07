import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { AIChatScreen } from '@/screens/AIChatScreen';
import { AnimeDetailsScreen } from '@/screens/AnimeDetailsScreen';
import { FilterScreen } from '@/screens/FilterScreen';
import { MainTabs } from './MainTabs';
import { colors } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import { useAiSession } from '@/state/AiSessionContext';
import { getAnimeById } from '@/services/animeRepository';
import { scoreAnime, buildInitialWeights } from '@/services/recommendationEngine';
import { explainFromMemory } from '@/services/aiConversation';

export type RootStackParamList = {
  Login: undefined;
  Welcome: undefined;
  AIChat: undefined;
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
  onLoginGoogle: () => void;
  onLoginApple: () => void;
  onLoginEmail: () => void;
}

export function RootNavigator({
  isAuthenticated,
  onLoginGoogle,
  onLoginApple,
  onLoginEmail,
}: RootNavigatorProps) {
  const { preferences, savedAnimeIds, toggleSaved, favoriteIds, setStatus, toggleFavorite, statusById } = useAppContext();
  const { memory, setAiDeck } = useAiSession();

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
        ) : (
          <>
            <Stack.Screen name="Welcome">
              {({ navigation }) => (
                <WelcomeScreen
                  onChooseAI={() => navigation.navigate('AIChat')}
                  onChooseBrowse={() => navigation.navigate('Main')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AIChat">
              {({ navigation }) => (
                <AIChatScreen
                  memory={memory}
                  onDeckReady={(deck) => {
                    setAiDeck(deck);
                    navigation.navigate('Main');
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Details"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            >
              {({ navigation, route }) => {
                const anime = getAnimeById(route.params.animeId);
                if (!anime) return null;
                const weights = buildInitialWeights(preferences);
                const match = scoreAnime(anime, weights);
                match.aiExplanation = explainFromMemory(memory, anime);
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
                    currentStatus={statusById[anime.id]}
                    isFavorite={favoriteIds.has(anime.id)}
                    onSetStatus={(st) => setStatus(anime.id, st as any)}
                    onToggleFavorite={() => toggleFavorite(anime.id)}
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

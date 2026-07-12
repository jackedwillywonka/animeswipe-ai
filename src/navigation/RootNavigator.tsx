import React from 'react';
import { ActivityIndicator, Text, View as RNView } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { AIChatScreen } from '@/screens/AIChatScreen';
import { AnimeDetailsScreen } from '@/screens/AnimeDetailsScreen';
import { SeasonsScreen } from '@/screens/SeasonsScreen';
import { FilterScreen } from '@/screens/FilterScreen';
import { MainTabs } from './MainTabs';
import { colors } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import { useAiSession } from '@/state/AiSessionContext';
import { getAnimeById, getAnimeByIdAsync } from '@/services/animeRepository';
import { scoreAnime, buildInitialWeights } from '@/services/recommendationEngine';
import { explainFromMemory } from '@/services/aiConversation';
import type { Anime } from '@/types';

export type RootStackParamList = {
  Login: undefined;
  Welcome: undefined;
  AIChat: undefined;
  Main: undefined;
  Details: { animeId: string; seed?: { id: string; title: string; posterUrl: string; episodes: number; year: number | null } };
  Seasons: { seasons: any[]; franchiseTitle: string };
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
  const { preferences, savedAnimeIds, toggleSaved, favoriteIds, setStatus, toggleFavorite, statusById, filters, setFilters } = useAppContext();
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
                // Seasons opened from the franchise list may not be cached yet -
                // fetch them instead of rendering a blank screen.
                // Render instantly from what we already know (the seasons list
                // gave us title/poster/episodes), then upgrade when the full
                // fetch lands. No spinner, no blank screen, never trapped.
                const seed = route.params.seed;
                const seedAnime: Anime | undefined = seed
                  ? ({
                      id: seed.id,
                      title: seed.title,
                      posterUrl: seed.posterUrl,
                      episodes: seed.episodes,
                      releaseYear: seed.year ?? 0,
                      rating: 0,
                      genres: [],
                      description: '',
                      status: 'finished',
                      studio: '',
                      runtimeMinutes: 0,
                    } as Anime)
                  : undefined;

                const [fetched, setFetched] = React.useState<Anime | undefined>(
                  () => getAnimeById(route.params.animeId) ?? seedAnime
                );
                React.useEffect(() => {
                  let cancelled = false;
                  const cachedNow = getAnimeById(route.params.animeId);
                  if (cachedNow) {
                    setFetched(cachedNow);
                    return;
                  }
                  // Retry with backoff - a single failed fetch (usually an
                  // AniList rate-limit) shouldn't leave the user stuck loading.
                  const attempt = async (tries: number) => {
                    for (let i = 0; i < tries; i++) {
                      if (cancelled) return;
                      const a = await getAnimeByIdAsync(route.params.animeId).catch(() => undefined);
                      if (a) {
                        if (!cancelled) setFetched(a);
                        return;
                      }
                      // wait longer each time: 1s, 2s, 3s
                      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
                    }
                  };
                  attempt(3);
                  return () => {
                    cancelled = true;
                  };
                }, [route.params.animeId]);

                const anime = fetched;
                if (!anime) {
                  console.warn('[details] no anime for id=', route.params.animeId);
                  // Show a loading state rather than a blank screen while the
                  // fetch completes (or retries after a rate-limit window).
                  return (
                    <RNView style={{ flex: 1, backgroundColor: colors.background }}>
                      <RNView style={{ paddingTop: 60, paddingHorizontal: 20 }}>
                        <Text
                          onPress={() => navigation.goBack()}
                          style={{ color: colors.violetLight, fontSize: 17 }}
                        >
                          ‹ Back
                        </Text>
                      </RNView>
                      <RNView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.violetLight} />
                        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
                          Loading…
                        </Text>
                      </RNView>
                    </RNView>
                  );
                }
                const weights = buildInitialWeights(preferences);
                const match = scoreAnime(anime, weights);
                match.aiExplanation = explainFromMemory(memory, anime);
                return (
                  <AnimeDetailsScreen
                    onViewSeasons={(seasons, franchiseTitle) =>
                      navigation.navigate('Seasons', { seasons, franchiseTitle })
                    }
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
            <Stack.Screen name="Seasons">
              {({ navigation, route }: any) => (
                <SeasonsScreen
                  franchiseTitle={route.params.franchiseTitle}
                  seasons={route.params.seasons}
                  onBack={() => navigation.goBack()}
                  onSelectSeason={(season) =>
                    navigation.push('Details', { animeId: season.id, seed: season })
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Filters" options={{ presentation: 'modal' }}>
              {({ navigation }) => (
                <FilterScreen
                  initialFilters={filters}
                  onApply={(f) => {
                    setFilters(f);
                    navigation.goBack();
                  }}
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

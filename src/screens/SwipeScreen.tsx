import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SwipeCard } from '@/components/SwipeCard';
import { SwipeActionButtons } from '@/components/SwipeActionButtons';
import { colors, spacing, typography } from '@/theme/tokens';
import { useSwipeDeck } from '@/hooks/useSwipeDeck';
import { useAppContext } from '@/state/AppContext';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SwipeScreen() {
  const navigation = useNavigation<Nav>();
  const { userId, preferences, recordLocalSwipe } = useAppContext();
  const { deck, currentAnime, currentMatch, isLoading, error, swipe } = useSwipeDeck(
    userId,
    preferences,
    recordLocalSwipe
  );

  const upcoming = deck.slice(1, 3); // render 2 cards behind the top card

  function openDetails() {
    if (!currentAnime) return;
    navigation.navigate('Details', { animeId: currentAnime.id });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.wordmark}>
          Anime<Text style={{ color: colors.pink }}>Swipe</Text> AI
        </Text>
        <Pressable style={styles.filterButton} onPress={() => navigation.navigate('Filters')}>
          <Text style={styles.filterIcon}>⚙</Text>
        </Pressable>
      </View>

      <Pressable style={styles.deckArea} onPress={openDetails} disabled={!currentAnime}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!error && isLoading && deck.length === 0 && (
          <ActivityIndicator size="large" color={colors.violetLight} />
        )}

        {!error && !isLoading && deck.length === 0 && (
          <Text style={styles.emptyText}>You're all caught up! Check back soon for more.</Text>
        )}

        {upcoming
          .slice()
          .reverse()
          .map((anime) => (
            <SwipeCard key={anime.id} anime={anime} onSwiped={() => {}} isTopCard={false} />
          ))}

        {currentAnime && (
          <SwipeCard
            key={currentAnime.id}
            anime={currentAnime}
            match={currentMatch}
            onSwiped={swipe}
            isTopCard
          />
        )}
      </Pressable>

      <Text style={styles.hint}>Tap the card for details · swipe to decide</Text>

      <View style={styles.actionsArea}>
        <SwipeActionButtons
          disabled={!currentAnime}
          onPass={() => swipe('left')}
          onLike={() => swipe('right')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  wordmark: {
    ...typography.display,
    fontSize: 20,
    color: colors.textPrimary,
  },
  filterButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  deckArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsArea: {
    paddingBottom: spacing.xl,
  },
  hint: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.pass,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

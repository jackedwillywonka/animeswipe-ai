import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SwipeCard } from '@/components/SwipeCard';
import { SwipeActionButtons } from '@/components/SwipeActionButtons';
import { AIChatScreen } from '@/screens/AIChatScreen';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { useSwipeDeck } from '@/hooks/useSwipeDeck';
import { useAppContext } from '@/state/AppContext';
import { fetchFranchiseInfo } from '@/services/anilistService';
import { useAiSession } from '@/state/AiSessionContext';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SwipeScreen() {
  const navigation = useNavigation<Nav>();
  const { userId, preferences, recordLocalSwipe, toggleSaved, savedAnimeIds, favoriteIds, setStatus, filters } = useAppContext();
  const { memory, aiDeck, setAiDeck } = useAiSession();
  const [chatOpen, setChatOpen] = useState(false);

  const { deck, currentAnime, currentMatch, isLoading, error, swipe } = useSwipeDeck(
    userId,
    preferences,
    recordLocalSwipe,
    aiDeck,
    savedAnimeIds,
    filters
  );

  const upcoming = deck.slice(1, 2);

  // Swiping right on an anime means you want the whole thing - add every
  // season of the franchise to Plan to Watch (they land together in the library).
  const addWholeFranchise = React.useCallback(
    async (animeId: string) => {
      try {
        const fr = await fetchFranchiseInfo(animeId);
        if (fr?.seasons && fr.seasons.length > 1) {
          for (const s of fr.seasons) {
            await setStatus(s.id, 'plan_to_watch');
          }
          return;
        }
      } catch {
        // fall through to single-season add
      }
      await setStatus(animeId, 'plan_to_watch');
    },
    [setStatus]
  );

  const handleDecision = React.useCallback(
    (direction: 'left' | 'right') => {
      const current = deck[0];
      if (current) {
        if (direction === 'right') {
          // Fire and forget - the deck advances immediately, seasons save in bg.
          addWholeFranchise(current.id);
        } else {
          setStatus(current.id, 'dropped');
        }
      }
      swipe(direction);
    },
    [deck, setStatus, swipe, addWholeFranchise]
  );

  function openDetails() {
    if (!currentAnime) return;
    navigation.navigate('Details', { animeId: currentAnime.id });
  }

  const usingAiDeck = aiDeck !== null && aiDeck.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ width: 32 }} />
        <Text style={styles.wordmark}>
          Anime<Text style={{ color: colors.pink }}>Swipe</Text> AI
        </Text>
        <Pressable style={styles.filterButton} onPress={() => navigation.navigate('Filters')}>
          <Text style={styles.filterLabel}>Filters</Text>
        </Pressable>
      </View>

      {usingAiDeck && (
        <View style={styles.aiDeckBadge}>
          <Text style={styles.aiDeckBadgeText}>✨ AI-curated deck · {deck.length} left</Text>
        </View>
      )}

      <View style={styles.deckArea}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!error && isLoading && deck.length === 0 && (
          <ActivityIndicator size="large" color={colors.violetLight} />
        )}

        {!error && !isLoading && deck.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              You made it through the whole deck! Tap the AI below for a fresh batch.
            </Text>
          </View>
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
            onSwiped={(dir) => handleDecision(dir)}
            onTap={openDetails}
            isTopCard
          />
        )}
      </View>

      <View style={styles.actionsArea}>
        <SwipeActionButtons
          disabled={!currentAnime}
          onPass={() => handleDecision('left')}
          onLike={() => handleDecision('right')}
        />
      </View>

      <Pressable style={styles.aiTab} onPress={() => setChatOpen(true)}>
        <Text style={styles.aiTabText}>✨ Ask the AI · refine your deck</Text>
      </Pressable>

      <Modal
        visible={chatOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChatOpen(false)}
      >
        <AIChatScreen
          isSheet
          memory={memory}
          onClose={() => setChatOpen(false)}
          onDeckReady={(newDeck) => {
            setAiDeck(newDeck);
            setChatOpen(false);
          }}
        />
      </Modal>
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
    paddingVertical: spacing.sm,
  },
  wordmark: {
    ...typography.display,
    fontSize: 20,
    color: colors.textPrimary,
  },
  filterButton: {
    paddingHorizontal: spacing.sm,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterLabel: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 14,
  },
  aiDeckBadge: {
    alignSelf: 'center',
    backgroundColor: colors.violetDeep,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  aiDeckBadgeText: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 12,
  },
  deckArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsArea: {
    paddingBottom: spacing.sm,
  },
  emptyState: {
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    ...typography.body,
    color: colors.pass,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  aiTab: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.violetDeep,
    borderWidth: 1,
    borderColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTabText: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 14,
  },
});

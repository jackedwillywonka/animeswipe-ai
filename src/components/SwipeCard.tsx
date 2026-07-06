import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadows, spacing, typography } from '@/theme/tokens';
import type { Anime, MatchResult, SwipeDirection } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const ROTATION_RANGE = 12; // degrees at full swipe

interface SwipeCardProps {
  anime: Anime;
  match?: MatchResult;
  onSwiped: (direction: SwipeDirection) => void;
  onTap?: () => void;
  isTopCard: boolean;
}

export function SwipeCard({ anime, match, onSwiped, onTap, isTopCard }: SwipeCardProps) {
  // Static back card: no gestures, no animations, no gradient - just poster + title.
  if (!isTopCard) {
    return (
      <View style={[styles.card, styles.backCard]}>
        <Image source={{ uri: anime.posterUrl }} style={styles.poster} resizeMode="cover" />
      </View>
    );
  }

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleSwipeComplete = (direction: SwipeDirection) => {
    onSwiped(direction);
    // Reset for the card's next appearance further back in the deck.
    translateX.value = 0;
    translateY.value = 0;
  };

  const tap = Gesture.Tap()
    .enabled(isTopCard && !!onTap)
    .maxDistance(12)
    .onEnd((_e, success) => {
      if (success && onTap) runOnJS(onTap)();
    });

  const pan = Gesture.Pan()
    .enabled(isTopCard)
    .activeOffsetX([-8, 8])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.5;
    })
    .onEnd((e) => {
      const passedThreshold = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      if (passedThreshold) {
        const direction: SwipeDirection = e.translationX > 0 ? 'right' : 'left';
        const flingX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        translateX.value = withSpring(flingX, { velocity: e.velocityX, damping: 18 }, () => {
          runOnJS(handleSwipeComplete)(direction);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-ROTATION_RANGE, 0, ROTATION_RANGE]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const composedGesture = onTap ? Gesture.Race(pan, tap) : pan;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.card, shadows.card, cardStyle]}>
        <Image source={{ uri: anime.posterUrl }} style={styles.poster} resizeMode="cover" />
        <LinearGradient colors={gradients.screenFade} style={styles.fade} />

        <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
          <Text style={[styles.stampText, { color: colors.like }]}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.passStamp, passStampStyle]}>
          <Text style={[styles.stampText, { color: colors.pass }]}>PASS</Text>
        </Animated.View>

        <View style={styles.infoContainer}>
          {match && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{match.matchPercent}% Match</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {anime.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>★ {anime.rating.toFixed(1)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{anime.episodes} eps</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{anime.releaseYear}</Text>
          </View>
          <View style={styles.genreRow}>
            {anime.genres.slice(0, 3).map((genre) => (
              <View key={genre} style={styles.genrePill}>
                <Text style={styles.genrePillText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = CARD_WIDTH * 1.45;

const styles = StyleSheet.create({
  backCard: {
    transform: [{ scale: 0.96 }],
    opacity: 0.7,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
  },
  fade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  stamp: {
    position: 'absolute',
    top: spacing.xl,
    borderWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  likeStamp: {
    left: spacing.lg,
    borderColor: colors.like,
    transform: [{ rotate: '-12deg' }],
  },
  passStamp: {
    right: spacing.lg,
    borderColor: colors.pass,
    transform: [{ rotate: '12deg' }],
  },
  stampText: {
    ...typography.display,
    fontSize: 28,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  matchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.violetLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  matchText: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 13,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  metaDot: {
    color: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  genrePill: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  genrePillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
});

import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { getSimilarAnime as getMockSimilarAnime } from '@/services/animeRepository';
import { explainRecommendation } from '@/services/aiService';
import type { Anime, MatchResult, UserPreferences } from '@/types';

interface AnimeDetailsScreenProps {
  anime: Anime;
  match?: MatchResult;
  preferences: UserPreferences;
  onBack: () => void;
  onSelectSimilar: (anime: Anime) => void;
  isSaved: boolean;
  onToggleSave: () => void;
}

export function AnimeDetailsScreen({
  anime,
  match,
  preferences,
  onBack,
  onSelectSimilar,
  isSaved,
  onToggleSave,
}: AnimeDetailsScreenProps) {
  const [aiExplanation, setAiExplanation] = useState<string>(match?.aiExplanation ?? '');
  const [loadingExplanation, setLoadingExplanation] = useState(!match?.aiExplanation);

  useEffect(() => {
    let cancelled = false;
    if (!match?.aiExplanation) {
      explainRecommendation(anime, preferences.likedAnime, preferences)
        .then((text) => !cancelled && setAiExplanation(text))
        .catch(() => !cancelled && setAiExplanation('We think this matches your taste.'))
        .finally(() => !cancelled && setLoadingExplanation(false));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime.id]);

  const similar = getMockSimilarAnime(anime);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.posterWrap}>
          <Image source={{ uri: anime.posterUrl }} style={styles.poster} resizeMode="cover" />
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={onToggleSave}>
            <Text style={styles.saveButtonText}>{isSaved ? '✓ Saved' : '+ Save'}</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{anime.title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>★ {anime.rating.toFixed(1)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{anime.episodes} eps</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{anime.runtimeMinutes} min</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{anime.releaseYear}</Text>
          </View>

          {match && (
            <View style={styles.matchCard}>
              <Text style={styles.matchPercent}>{match.matchPercent}% Match</Text>
              {match.reasons.length > 0 && (
                <View style={styles.reasonsRow}>
                  {match.reasons.map((reason) => (
                    <Text key={reason} style={styles.reasonItem}>
                      ✓ {reason}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <Section title="Why we picked this for you">
            <Text style={styles.bodyText}>
              {loadingExplanation ? 'Thinking…' : aiExplanation}
            </Text>
          </Section>

          <Section title="Description">
            <Text style={styles.bodyText}>{anime.description}</Text>
          </Section>

          <Section title="Details">
            <DetailRow label="Studio" value={anime.studio} />
            <DetailRow label="Genres" value={anime.genres.join(', ')} />
            <DetailRow label="Status" value={anime.status === 'airing' ? 'Airing' : 'Finished'} />
            {anime.ageRating && <DetailRow label="Age Rating" value={anime.ageRating} />}
          </Section>

          {anime.streaming && anime.streaming.length > 0 && (
            <Section title="Watch it on">
              <View style={styles.streamingRow}>
                {anime.streaming.filter((link, i, arr) => arr.findIndex((l) => l.platform === link.platform) === i).map((link) => (
                  <Pressable
                    key={`${link.platform}-${link.url}`}
                    style={styles.streamingButton}
                    onPress={() => Linking.openURL(link.url)}
                  >
                    <Text style={styles.streamingButtonText}>{link.platform}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          )}

          {similar.length > 0 && (
            <Section title="Similar Anime">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {similar.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.similarCard}
                    onPress={() => onSelectSimilar(s)}
                  >
                    <Image source={{ uri: s.posterUrl }} style={styles.similarPoster} />
                    <Text style={styles.similarTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  posterWrap: {
    width: '100%',
    aspectRatio: 0.8,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 26,
  },
  saveButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 13,
  },
  content: {
    padding: spacing.lg,
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
    marginBottom: spacing.md,
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
  matchCard: {
    backgroundColor: colors.violetDeep,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  matchPercent: {
    ...typography.display,
    color: colors.violetLight,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  reasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reasonItem: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 17,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 13,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 13,
    flexShrink: 1,
    textAlign: 'right',
  },
  streamingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  streamingButton: {
    borderWidth: 1.5,
    borderColor: colors.violetCore,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  streamingButtonText: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 13,
  },
  similarCard: {
    width: 110,
    marginRight: spacing.md,
  },
  similarPoster: {
    width: 110,
    height: 155,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  similarTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
  },
});

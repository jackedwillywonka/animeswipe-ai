import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrailerPlayer } from '@/components/TrailerPlayer';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { getSimilarAnime as getMockSimilarAnime } from '@/services/animeRepository';
import { explainRecommendation } from '@/services/aiService';
import { fetchFranchiseInfo, type FranchiseInfo } from '@/services/anilistService';
import type { Anime, MatchResult, UserPreferences } from '@/types';

interface AnimeDetailsScreenProps {
  anime: Anime;
  match?: MatchResult;
  preferences: UserPreferences;
  onBack: () => void;
  onSelectSimilar: (anime: Anime) => void;
  isSaved: boolean;
  onToggleSave: () => void;
  currentStatus?: string;
  isFavorite: boolean;
  onSetStatus: (status: string) => void;
  onToggleFavorite: () => void;
}


const FORMAT_LABELS: Record<string, string> = {
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music Video',
};

export function AnimeDetailsScreen({
  anime,
  match,
  preferences,
  onBack,
  onSelectSimilar,
  isSaved,
  onToggleSave,
  currentStatus,
  isFavorite,
  onSetStatus,
  onToggleFavorite,
}: AnimeDetailsScreenProps) {
  const [localStatus, setLocalStatus] = useState<string | undefined>(currentStatus);
  const [localFav, setLocalFav] = useState<boolean>(isFavorite);
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const [trailerBroken, setTrailerBroken] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string>(match?.aiExplanation ?? '');
  const [loadingExplanation, setLoadingExplanation] = useState(!match?.aiExplanation);

  useEffect(() => { setLocalStatus(currentStatus); }, [currentStatus]);
  useEffect(() => { setTrailerPlaying(false); setTrailerBroken(false); }, [anime.id]);

  const [franchise, setFranchise] = useState<FranchiseInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    setFranchise(null);
    fetchFranchiseInfo(anime.id)
      .then((info) => { if (!cancelled) setFranchise(info); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [anime.id]);
  useEffect(() => { setLocalFav(isFavorite); }, [isFavorite]);

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
            <Text style={styles.metaText}>
              {anime.format && FORMAT_LABELS[anime.format]
                ? FORMAT_LABELS[anime.format]
                : anime.episodes > 0
                ? `${anime.episodes} eps${franchise && franchise.totalSeasons > 1 ? ' (this season)' : ''}`
                : anime.nextAiring?.episode
                ? `${anime.nextAiring.episode - 1} eps (so far)`
                : anime.status === 'airing'
                ? 'Ongoing'
                : 'Episodes TBA'}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{anime.runtimeMinutes} min</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{anime.releaseYear}</Text>
          </View>

          {franchise && !(anime.format && FORMAT_LABELS[anime.format]) && (
            <Text style={styles.franchiseText}>
              {franchise.hasOngoing
                ? franchise.totalEpisodes > 0
                  ? `Season ${franchise.seasonNumber} of ${franchise.totalSeasons} · ${franchise.totalEpisodes}+ episodes total · ongoing`
                  : `Season ${franchise.seasonNumber} of ${franchise.totalSeasons} · ongoing series`
                : `Season ${franchise.seasonNumber} of ${franchise.totalSeasons} · ${franchise.totalEpisodes} episodes total`}
            </Text>
          )}


          <View style={styles.statusSection}>
            <View style={styles.statusRow}>
              {(['watching', 'completed', 'plan_to_watch', 'dropped'] as const).map((st) => {
                const labels: Record<string, string> = {
                  watching: 'Watching',
                  completed: 'Completed',
                  plan_to_watch: 'Plan to Watch',
                  dropped: 'Dropped',
                };
                const active = localStatus === st;
                return (
                  <Pressable
                    key={st}
                    onPress={() => { setLocalStatus(st); onSetStatus(st); }}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                      {labels[st]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={onToggleFavorite}
              style={[styles.favButton, isFavorite && styles.favButtonActive]}
            >
              <Text style={styles.favButtonText}>
                {isFavorite ? '♥ Favorited' : '♡ Add to Favorites'}
              </Text>
            </Pressable>
          </View>

          <Section title="Trailer">
              {trailerBroken || !anime.trailerYouTubeId ? (
                <Pressable
                  style={styles.tiktokButton}
                  onPress={() =>
                    Linking.openURL(
                      `https://www.youtube.com/results?search_query=${encodeURIComponent(
                        anime.title + ' trailer'
                      )}`
                    )
                  }
                >
                  <Text style={styles.tiktokButtonText}>▶ Watch trailer on YouTube</Text>
                </Pressable>
              ) : trailerPlaying ? (
                <View style={styles.trailerPlayerWrap}>
                  <TrailerPlayer
                    videoId={anime.trailerYouTubeId}
                    height={210}
                    onError={() => setTrailerBroken(true)}
                  />
                </View>
              ) : (
                <Pressable
                  style={styles.trailerThumbWrap}
                  onPress={() => setTrailerPlaying(true)}
                >
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${anime.trailerYouTubeId}/hqdefault.jpg` }}
                    style={styles.trailerThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.trailerPlayBadge}>
                    <Text style={styles.trailerPlayIcon}>▶</Text>
                  </View>
                </Pressable>
              )}
            </Section>

          <Section title="Fan edits">
            <Pressable
              style={styles.tiktokButton}
              onPress={async () => {
                const q = encodeURIComponent(anime.title + ' edit');
                // Hashtag slug: "Black Clover" -> "blackcloveredit"
                const tag = anime.title.toLowerCase().replace(/[^a-z0-9]/g, '') + 'edit';
                if (Platform.OS === 'web') {
                  // No app schemes in browsers - hashtag pages render publicly
                  Linking.openURL(`https://www.tiktok.com/tag/${tag}`);
                  return;
                }
                try {
                  // TikTok's internal scheme - honors search keywords
                  await Linking.openURL(`snssdk1233://search?keyword=${q}`);
                } catch {
                  // Fall back to the hashtag page (reliably opens in the app)
                  Linking.openURL(`https://www.tiktok.com/tag/${tag}`);
                }
              }}
            >
              <Text style={styles.tiktokButtonText}>🎬 Watch {anime.title} edits on TikTok</Text>
            </Pressable>
          </Section>

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
  franchiseText: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 14,
    marginBottom: spacing.lg,
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
  statusSection: {
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
  },
  statusChipActive: {
    borderColor: colors.violetCore,
    backgroundColor: colors.violetDeep,
  },
  statusChipText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusChipTextActive: {
    color: colors.textPrimary,
  },
  favButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.pink,
  },
  favButtonActive: {
    backgroundColor: colors.pink,
  },
  favButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 13,
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
  trailerPlayerWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  trailerThumbWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailerThumb: {
    ...StyleSheet.absoluteFillObject,
  },
  trailerPlayBadge: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailerPlayIcon: {
    color: colors.textPrimary,
    fontSize: 24,
    marginLeft: 4,
  },
  tiktokButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.pink,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
  },
  tiktokButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
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

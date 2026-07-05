import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { UserPreferences } from '@/types';

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Dark Fantasy',
];

interface OnboardingScreenProps {
  onComplete: (preferences: UserPreferences) => void;
}

type Step = 'genres' | 'format' | 'language' | 'status';

const STEP_ORDER: Step[] = ['genres', 'format', 'language', 'status'];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [moviesOrSeries, setMoviesOrSeries] = useState<UserPreferences['moviesOrSeries']>('either');
  const [dubOrSub, setDubOrSub] = useState<UserPreferences['dubOrSub']>('either');
  const [ongoingOrFinished, setOngoingOrFinished] =
    useState<UserPreferences['ongoingOrFinished']>('either');

  const step = STEP_ORDER[stepIndex];
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function handleNext() {
    if (isLastStep) {
      onComplete({
        favoriteGenres: selectedGenres,
        likedAnime: [],
        dislikedGenres: [],
        dubOrSub,
        moviesOrSeries,
        ongoingOrFinished,
      });
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  const canProceed = step !== 'genres' || selectedGenres.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar current={stepIndex + 1} total={STEP_ORDER.length} />

      <View style={styles.content}>
        {step === 'genres' && (
          <StepBlock title="What genres do you love?" subtitle="Pick as many as you like.">
            <View style={styles.chipGrid}>
              {GENRE_OPTIONS.map((genre) => (
                <Chip
                  key={genre}
                  label={genre}
                  selected={selectedGenres.includes(genre)}
                  onPress={() => toggleGenre(genre)}
                />
              ))}
            </View>
          </StepBlock>
        )}

        {step === 'format' && (
          <StepBlock title="Movies, series, or both?">
            <View style={styles.optionColumn}>
              {(['movies', 'series', 'either'] as const).map((option) => (
                <OptionRow
                  key={option}
                  label={option === 'either' ? 'Both' : capitalize(option)}
                  selected={moviesOrSeries === option}
                  onPress={() => setMoviesOrSeries(option)}
                />
              ))}
            </View>
          </StepBlock>
        )}

        {step === 'language' && (
          <StepBlock title="Dub or sub?">
            <View style={styles.optionColumn}>
              {(['dub', 'sub', 'either'] as const).map((option) => (
                <OptionRow
                  key={option}
                  label={option === 'either' ? 'No preference' : capitalize(option)}
                  selected={dubOrSub === option}
                  onPress={() => setDubOrSub(option)}
                />
              ))}
            </View>
          </StepBlock>
        )}

        {step === 'status' && (
          <StepBlock title="Ongoing or finished shows?">
            <View style={styles.optionColumn}>
              {(['ongoing', 'finished', 'either'] as const).map((option) => (
                <OptionRow
                  key={option}
                  label={option === 'either' ? 'Both' : capitalize(option)}
                  selected={ongoingOrFinished === option}
                  onPress={() => setOngoingOrFinished(option)}
                />
              ))}
            </View>
          </StepBlock>
        )}
      </View>

      <Pressable
        onPress={handleNext}
        disabled={!canProceed}
        style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
      >
        <Text style={styles.nextButtonText}>{isLastStep ? "Let's go" : 'Continue'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressSegment, i < current && styles.progressSegmentActive]}
        />
      ))}
    </View>
  );
}

function StepBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.stepTitle}>{title}</Text>
      {subtitle && <Text style={styles.stepSubtitle}>{subtitle}</Text>}
      <View style={{ marginTop: spacing.lg }}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.optionRow, selected && styles.optionRowSelected]}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
      {selected && <View style={styles.optionDot} />}
    </Pressable>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  progressSegmentActive: {
    backgroundColor: colors.violetCore,
  },
  content: {
    flex: 1,
  },
  stepTitle: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 26,
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
  },
  chipSelected: {
    borderColor: colors.violetCore,
    backgroundColor: colors.violetDeep,
  },
  chipText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.textPrimary,
  },
  optionColumn: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
  },
  optionRowSelected: {
    borderColor: colors.violetCore,
    backgroundColor: colors.violetDeep,
  },
  optionText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 16,
  },
  optionTextSelected: {
    color: colors.textPrimary,
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.violetLight,
  },
  nextButton: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontSize: 16,
  },
});

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { DEFAULT_FILTERS, type AppFilters } from '@/services/anilistService';

// AniList's actual genre list (what the API can filter by)
const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
  'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

interface FilterScreenProps {
  initialFilters: AppFilters;
  onApply: (filters: AppFilters) => void;
  onClose: () => void;
}

export function FilterScreen({ initialFilters, onApply, onClose }: FilterScreenProps) {
  const safeInitial: AppFilters = { ...DEFAULT_FILTERS, ...initialFilters };
  const [genres, setGenres] = useState<string[]>(safeInitial.genres);
  const [format, setFormat] = useState<AppFilters['format']>(safeInitial.format);
  const [status, setStatus] = useState<AppFilters['status']>(safeInitial.status);
  const [era, setEra] = useState<AppFilters['era']>(safeInitial.era);
  const [minScore, setMinScore] = useState<AppFilters['minScore']>(safeInitial.minScore);

  function toggleGenre(genre: string) {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function handleReset() {
    setGenres([]);
    setFormat('any');
    setStatus('any');
    setEra('any');
    setMinScore(0);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <Text style={styles.headerAction}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Filters</Text>
        <Pressable onPress={handleReset}>
          <Text style={styles.headerAction}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FilterSection title="Genres">
          <ChipGrid options={GENRES} selected={genres} onToggle={toggleGenre} />
        </FilterSection>

        <FilterSection title="Format">
          <SingleChoiceRow
            options={[
              { key: 'any', label: 'Any' },
              { key: 'tv', label: 'Series' },
              { key: 'movie', label: 'Movies' },
            ]}
            value={format}
            onChange={(v) => setFormat(v as AppFilters['format'])}
          />
        </FilterSection>

        <FilterSection title="Status">
          <SingleChoiceRow
            options={[
              { key: 'any', label: 'Any' },
              { key: 'airing', label: 'Airing Now' },
              { key: 'finished', label: 'Finished' },
            ]}
            value={status}
            onChange={(v) => setStatus(v as AppFilters['status'])}
          />
        </FilterSection>

        <FilterSection title="Era">
          <SingleChoiceRow
            options={[
              { key: 'any', label: 'Any' },
              { key: '2020s', label: '2020s' },
              { key: '2010s', label: '2010s' },
              { key: '2000s', label: '2000s' },
              { key: 'older', label: 'Before 2000' },
            ]}
            value={era}
            onChange={(v) => setEra(v as AppFilters['era'])}
          />
        </FilterSection>

        <FilterSection title="Minimum Rating">
          <SingleChoiceRow
            options={[
              { key: '0', label: 'Any' },
              { key: '6', label: '6+' },
              { key: '7', label: '7+' },
              { key: '8', label: '8+' },
            ]}
            value={String(minScore)}
            onChange={(v) => setMinScore(Number(v) as AppFilters['minScore'])}
          />
        </FilterSection>
      </ScrollView>

      <Pressable
        style={styles.applyButton}
        onPress={() => onApply({ genres, format, status, era, minScore })}
      >
        <Text style={styles.applyButtonText}>Apply Filters</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => onToggle(option)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SingleChoiceRow({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((option) => {
        const isSelected = value === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 17,
  },
  headerAction: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 14,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: spacing.sm,
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
    fontSize: 13,
  },
  chipTextSelected: {
    color: colors.textPrimary,
  },
  applyButton: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  applyButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontSize: 16,
  },
});

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { FilterOptions } from '@/types';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Dark Fantasy',
];
const STUDIOS = ['MAPPA', 'Madhouse', 'WIT Studio', 'A-1 Pictures', 'Kyoto Animation', 'Bones'];
const PLATFORMS = ['Crunchyroll', 'Netflix', 'Hulu', 'Funimation'];

interface FilterScreenProps {
  initialFilters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  onClose: () => void;
}

export function FilterScreen({ initialFilters, onApply, onClose }: FilterScreenProps) {
  const [genres, setGenres] = useState<string[]>(initialFilters.genres ?? []);
  const [type, setType] = useState<FilterOptions['type']>(initialFilters.type ?? 'either');
  const [status, setStatus] = useState<FilterOptions['status']>(initialFilters.status ?? 'either');
  const [language, setLanguage] = useState<FilterOptions['language']>(
    initialFilters.language ?? 'either'
  );
  const [studio, setStudio] = useState<string | undefined>(initialFilters.studio);
  const [platform, setPlatform] = useState<string | undefined>(initialFilters.platform);

  function toggleGenre(genre: string) {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  function handleReset() {
    setGenres([]);
    setType('either');
    setStatus('either');
    setLanguage('either');
    setStudio(undefined);
    setPlatform(undefined);
  }

  function handleApply() {
    onApply({ genres, type, status, language, studio, platform });
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
        <FilterSection title="Genre">
          <ChipGrid options={GENRES} selected={genres} onToggle={toggleGenre} />
        </FilterSection>

        <FilterSection title="Type">
          <SingleChoiceRow
            options={[
              { key: 'movie', label: 'Movie' },
              { key: 'series', label: 'Series' },
              { key: 'either', label: 'Both' },
            ]}
            value={type}
            onChange={(v) => setType(v as FilterOptions['type'])}
          />
        </FilterSection>

        <FilterSection title="Status">
          <SingleChoiceRow
            options={[
              { key: 'airing', label: 'Airing' },
              { key: 'finished', label: 'Finished' },
              { key: 'either', label: 'Both' },
            ]}
            value={status}
            onChange={(v) => setStatus(v as FilterOptions['status'])}
          />
        </FilterSection>

        <FilterSection title="Language">
          <SingleChoiceRow
            options={[
              { key: 'dub', label: 'Dub' },
              { key: 'sub', label: 'Sub' },
              { key: 'either', label: 'Both' },
            ]}
            value={language}
            onChange={(v) => setLanguage(v as FilterOptions['language'])}
          />
        </FilterSection>

        <FilterSection title="Studio">
          <ChipGrid
            options={STUDIOS}
            selected={studio ? [studio] : []}
            onToggle={(s) => setStudio(studio === s ? undefined : s)}
          />
        </FilterSection>

        <FilterSection title="Streaming Platform">
          <ChipGrid
            options={PLATFORMS}
            selected={platform ? [platform] : []}
            onToggle={(p) => setPlatform(platform === p ? undefined : p)}
          />
        </FilterSection>
      </ScrollView>

      <Pressable style={styles.applyButton} onPress={handleApply}>
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

function SingleChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
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

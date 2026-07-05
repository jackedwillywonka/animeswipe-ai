import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { searchAnimeNaturalLanguage } from '@/services/aiService';
import type { Anime } from '@/types';

const SUGGESTIONS = [
  'I want something like Death Note',
  'Something emotional',
  'Anime with amazing fights',
  'I need a short anime',
];

interface AISearchScreenProps {
  onSelectAnime: (anime: Anime) => void;
}

export function AISearchScreen({ onSelectAnime }: AISearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  async function runSearch(text: string) {
    if (!text.trim()) return;
    setQuery(text);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const found = await searchAnimeNaturalLanguage(text);
      setResults(found);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.header}>Ask AnimeSwipe</Text>

      <View style={styles.inputRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query)}
          placeholder="Describe what you want to watch…"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={() => runSearch(query)}>
          <Text style={styles.searchButtonText}>Go</Text>
        </Pressable>
      </View>

      {!hasSearched && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.suggestionChip} onPress={() => runSearch(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {isSearching && <Text style={styles.statusText}>Thinking…</Text>}

      {hasSearched && !isSearching && results.length === 0 && (
        <Text style={styles.statusText}>No matches. Try describing it differently.</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.resultsList}
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => onSelectAnime(item)}>
            <Image source={{ uri: item.posterUrl }} style={styles.resultPoster} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>{item.title}</Text>
              <Text style={styles.resultMeta}>
                {item.genres.slice(0, 2).join(' · ')} · {item.episodes} eps
              </Text>
              <Text style={styles.resultDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 24,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 15,
  },
  searchButton: {
    width: 56,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
  },
  suggestions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  statusText: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  resultsList: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultPoster: {
    width: 70,
    height: 98,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 2,
  },
  resultMeta: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginBottom: 4,
  },
  resultDescription: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});

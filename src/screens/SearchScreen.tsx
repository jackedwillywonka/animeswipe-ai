import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { searchAnimeByText } from '@/services/anilistService';
import type { Anime } from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<any>(null);

  // Debounced live search: waits 600ms after the user stops typing,
  // so we do not hit AniList on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchAnimeByText(text, 20);
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.header}>Search</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search any anime…"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        )}
      </View>

      {isSearching && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.violetLight} />
        </View>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>
            No results for "{query.trim()}". Check the spelling or try the English or Japanese title.
          </Text>
        </View>
      )}

      {!isSearching && !hasSearched && (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>
            Type an anime title to find trailers, fan edits, episode info, and more.
          </Text>
        </View>
      )}

      {!isSearching && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultRow}
              onPress={() => navigation.navigate('Details', { animeId: item.id })}
            >
              <Image source={{ uri: item.posterUrl }} style={styles.resultPoster} />
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.resultMeta}>
                  ★ {item.rating.toFixed(1)}
                  {item.releaseYear ? ` · ${item.releaseYear}` : ''}
                  {item.format === 'MOVIE'
                    ? ' · Movie'
                    : item.format === 'SPECIAL'
                    ? ' · Special'
                    : item.format === 'OVA'
                    ? ' · OVA'
                    : item.format === 'ONA'
                    ? ' · ONA'
                    : item.episodes > 0
                    ? ` · ${item.episodes} eps`
                    : ' · Ongoing'}
                </Text>
                <Text style={styles.resultGenres} numberOfLines={1}>
                  {item.genres.slice(0, 3).join(' · ')}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 24,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 15,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.md,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.textTertiary,
    fontSize: 16,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  resultPoster: {
    width: 72,
    height: 102,
    backgroundColor: colors.surface,
  },
  resultInfo: {
    flex: 1,
    padding: spacing.md,
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
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  resultGenres: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 11,
  },
});

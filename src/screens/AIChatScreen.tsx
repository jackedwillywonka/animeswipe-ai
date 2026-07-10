import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import {
  GREETING,
  processUserMessage,
  type ChatMessage,
  type SessionMemory,
} from '@/services/aiConversation';
import { useAppContext } from '@/state/AppContext';
import { getAnimeById } from '@/services/animeRepository';
import { consumeAiChat, getAiQuotaStatus, FREE_DAILY_AI_LIMIT, startCheckout } from '@/services/premiumService';
import type { Anime } from '@/types';

interface AIChatScreenProps {
  memory: SessionMemory;
  onDeckReady: (deck: Anime[]) => void;
  onClose?: () => void;
  isSheet?: boolean; // true when opened as the bottom tab during swiping
}

export function AIChatScreen({ memory, onDeckReady, onClose, isSheet }: AIChatScreenProps) {
  const { savedAnimeIds, userId } = useAppContext();
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [quota, setQuota] = useState<{ isPremium: boolean; usedToday: number } | null>(null);
  const [capped, setCapped] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  // KeyboardAvoidingView is unreliable inside pageSheet modals on iOS,
  // so we track the keyboard height ourselves and pad the bottom manually.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomPad = Math.max(0, keyboardHeight - (isSheet ? 0 : insets.bottom));
  const [, forceRender] = useState(0);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (userId) {
      getAiQuotaStatus(userId).then((q) => {
        setQuota({ isPremium: q.isPremium, usedToday: q.usedToday });
        setCapped(!q.allowed);
      });
    }
  }, [userId]);

  useEffect(() => {
    if (memory.messages.length === 0) {
      memory.messages.push({
        id: 'greeting',
        role: 'assistant',
        text: GREETING,
        timestamp: new Date().toISOString(),
      });
      forceRender((n) => n + 1);
    }
  }, [memory]);

  function doReset() {
    // Wipe the conversation and its carried-over context, back to the greeting.
    memory.messages = [];
    memory.likedTitles = [];
    memory.themes = new Set();
    memory.genres = new Set();
    memory.excludeGenres = new Set();
    memory.lastDeckIds = [];
    memory.messages.push({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: GREETING,
      timestamp: new Date().toISOString(),
    });
    setInput('');
    forceRender((n) => n + 1);
  }

  function handleReset() {
    Alert.alert(
      'Start a new chat?',
      'Are you sure you want to start a new conversation? Your current chat will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New Chat', style: 'destructive', onPress: doReset },
      ]
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isThinking) return;

    // Gate: free users get FREE_DAILY_AI_LIMIT chats per day.
    const q = await consumeAiChat(userId);
    setQuota({ isPremium: q.isPremium, usedToday: q.usedToday });
    if (!q.allowed) {
      setCapped(true);
      return; // don't send; the upgrade prompt renders instead
    }

    setInput('');
    setIsThinking(true);
    forceRender((n) => n + 1); // show user's message immediately

    try {
      // Resolve library titles from the local cache (no network needed)
      const libraryTitles = Array.from(savedAnimeIds)
        .map((id) => getAnimeById(id)?.title)
        .filter((t): t is string => Boolean(t));
      const { deck } = await processUserMessage(memory, text, libraryTitles);
      forceRender((n) => n + 1);
      if (deck.length > 0) {
        setTimeout(() => onDeckReady(deck), 900);
      }
    } catch (e) {
      memory.messages.push({
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `Hmm, I hit a snag: ${e instanceof Error ? e.message : String(e)}. Mind trying again?`,
        timestamp: new Date().toISOString(),
      });
      forceRender((n) => n + 1);
    } finally {
      setIsThinking(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [memory.messages.length, isThinking]);

  return (
    <SafeAreaView style={styles.container} edges={isSheet ? [] : ['top', 'bottom']}>
      {isSheet && (
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHandle} />
          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Back to swiping ↓</Text>
            </Pressable>
          )}
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>New chat</Text>
          </Pressable>
        </View>
      )}

      {quota && !quota.isPremium && !capped && (
        <Text style={styles.quotaChip}>
          {Math.max(0, FREE_DAILY_AI_LIMIT - quota.usedToday)} free AI chat
          {FREE_DAILY_AI_LIMIT - quota.usedToday === 1 ? '' : 's'} left today
        </Text>
      )}

      <View style={[styles.flex, { paddingBottom: bottomPad }]}>
        <FlatList
          ref={listRef}
          data={memory.messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.role === 'user' ? styles.userBubbleText : styles.aiBubbleText,
                ]}
              >
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            isThinking ? (
              <View style={[styles.bubble, styles.aiBubble]}>
                <Text style={styles.aiBubbleText}>Searching the anime universe…</Text>
              </View>
            ) : null
          }
        />

        {capped ? (
          <View style={styles.upgradeBox}>
            <Text style={styles.upgradeTitle}>You've used your {FREE_DAILY_AI_LIMIT} free AI chats today ✨</Text>
            <Text style={styles.upgradeBody}>
              Go Premium for unlimited AI recommendations and a smarter brain — $2.99/month.
            </Text>
            <Pressable
              style={styles.upgradeButton}
              onPress={() => startCheckout(userId)}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </Pressable>
            <Text style={styles.upgradeReset}>Your free chats reset tomorrow.</Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              placeholder="Describe what you want to watch…"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              returnKeyType="send"
              multiline
            />
            <Pressable
              onPress={handleSend}
              disabled={isThinking || !input.trim()}
              style={[styles.sendButton, (isThinking || !input.trim()) && styles.sendDisabled]}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  resetButtonText: {
    ...typography.bodyMedium,
    color: colors.pass,
    fontWeight: '700',
    fontSize: 13,
  },
  closeButton: {
    paddingVertical: spacing.xs,
  },
  closeButtonText: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 13,
  },
  messages: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderBottomLeftRadius: radius.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.violetCore,
    borderBottomRightRadius: radius.sm,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  aiBubbleText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  userBubbleText: {
    ...typography.body,
    color: colors.white,
  },
  quotaChip: {
    ...typography.body,
    color: colors.violetLight,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  upgradeBox: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.violetDeep,
    borderWidth: 1.5,
    borderColor: colors.violetCore,
    alignItems: 'center',
  },
  upgradeTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 17,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  upgradeBody: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  upgradeButton: {
    backgroundColor: colors.violetCore,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  upgradeButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontSize: 15,
  },
  upgradeReset: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
});

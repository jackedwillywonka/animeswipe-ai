import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import {
  GREETING,
  processUserMessage,
  type ChatMessage,
  type SessionMemory,
} from '@/services/aiConversation';
import type { Anime } from '@/types';

interface AIChatScreenProps {
  memory: SessionMemory;
  onDeckReady: (deck: Anime[]) => void;
  onClose?: () => void;
  isSheet?: boolean; // true when opened as the bottom tab during swiping
}

export function AIChatScreen({ memory, onDeckReady, onClose, isSheet }: AIChatScreenProps) {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [, forceRender] = useState(0);
  const listRef = useRef<FlatList<ChatMessage>>(null);

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

  async function handleSend() {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput('');
    setIsThinking(true);
    forceRender((n) => n + 1); // show user's message immediately

    try {
      const { deck } = await processUserMessage(memory, text);
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
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={isSheet ? 8 : 40}
      >
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
      </KeyboardAvoidingView>
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

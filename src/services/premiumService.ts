import { supabase } from './supabase';

export const FREE_DAILY_AI_LIMIT = 3;

export interface AiQuotaResult {
  allowed: boolean;
  isPremium: boolean;
  usedToday: number;
  limit: number;
}

function todayStr(): string {
  // Local calendar day, YYYY-MM-DD
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Checks whether the user may start another AI chat today, and if so,
 * counts it. Premium users are always allowed and never counted.
 * Fails OPEN (allows the chat) on any error so a backend hiccup never
 * blocks a paying-or-free user from the core feature.
 */
export async function consumeAiChat(userId: string): Promise<AiQuotaResult> {
  const fallback: AiQuotaResult = {
    allowed: true,
    isPremium: false,
    usedToday: 0,
    limit: FREE_DAILY_AI_LIMIT,
  };
  if (!userId) return fallback;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_premium, ai_chats_today, ai_chats_date')
      .eq('id', userId)
      .maybeSingle();
    if (error || !profile) return fallback;

    if (profile.is_premium) {
      return { allowed: true, isPremium: true, usedToday: 0, limit: Infinity };
    }

    const today = todayStr();
    // New day → count resets.
    const used = profile.ai_chats_date === today ? profile.ai_chats_today : 0;

    if (used >= FREE_DAILY_AI_LIMIT) {
      return { allowed: false, isPremium: false, usedToday: used, limit: FREE_DAILY_AI_LIMIT };
    }

    // Allowed → increment and persist.
    const nextCount = used + 1;
    const { error: writeError } = await supabase
      .from('profiles')
      .update({ ai_chats_today: nextCount, ai_chats_date: today })
      .eq('id', userId);

    return {
      allowed: true,
      isPremium: false,
      usedToday: nextCount,
      limit: FREE_DAILY_AI_LIMIT,
    };
  } catch {
    return fallback;
  }
}

/** Read-only check of remaining chats, for display (does not consume). */
export async function getAiQuotaStatus(userId: string): Promise<AiQuotaResult> {
  const fallback: AiQuotaResult = {
    allowed: true,
    isPremium: false,
    usedToday: 0,
    limit: FREE_DAILY_AI_LIMIT,
  };
  if (!userId) return fallback;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, ai_chats_today, ai_chats_date')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return fallback;
    if (profile.is_premium) {
      return { allowed: true, isPremium: true, usedToday: 0, limit: Infinity };
    }
    const today = todayStr();
    const used = profile.ai_chats_date === today ? profile.ai_chats_today : 0;
    return {
      allowed: used < FREE_DAILY_AI_LIMIT,
      isPremium: false,
      usedToday: used,
      limit: FREE_DAILY_AI_LIMIT,
    };
  } catch {
    return fallback;
  }
}

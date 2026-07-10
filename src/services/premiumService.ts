import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
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


const CHECKOUT_URL =
  'https://zhtnhuvngdvpdyufswco.supabase.co/functions/v1/create-checkout';

/** Opens Stripe Checkout for the Premium subscription. */
export async function startCheckout(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const returnUrl =
      Platform.OS === 'web' ? window.location.origin : 'https://animeswipe-ai.vercel.app';
    const res = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, returnUrl }),
    });
    const data = await res.json();
    if (!data.url) { console.warn('[checkout] no url', data); return; }
    if (Platform.OS === 'web') {
      window.location.href = data.url;
    } else {
      await WebBrowser.openBrowserAsync(data.url);
    }
  } catch (e) {
    console.warn('[checkout] failed', e);
  }
}

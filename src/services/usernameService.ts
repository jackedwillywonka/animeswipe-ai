import { supabase } from './supabase';

/** Get the current user's username (null if not set yet). */
export async function getUsername(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    return data?.username ?? null;
  } catch {
    return null;
  }
}

export interface SetUsernameResult {
  ok: boolean;
  error?: string;
}

/** Sets the username after validating format and uniqueness. */
export async function setUsername(
  userId: string,
  raw: string
): Promise<SetUsernameResult> {
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const username = raw.trim();

  if (username.length < 3) return { ok: false, error: 'At least 3 characters.' };
  if (username.length > 20) return { ok: false, error: 'Max 20 characters.' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { ok: false, error: 'Only letters, numbers, and underscores.' };
  }

  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    if (existing && existing.id !== userId) {
      return { ok: false, error: 'That username is taken.' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', userId);
    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        return { ok: false, error: 'That username is taken.' };
      }
      return { ok: false, error: 'Could not save. Try again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}

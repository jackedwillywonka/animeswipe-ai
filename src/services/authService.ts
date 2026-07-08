import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getDeviceUserId } from './deviceUser';
import type { Session } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = AuthSession.makeRedirectUri();

/** Pulls tokens out of the OAuth callback URL and creates a session. */
async function createSessionFromUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token) return null;
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
}

/** Opens Google's sign-in in a browser sheet and returns the session. */
export async function signInWithGoogle(): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success' && result.url) {
    return createSessionFromUrl(result.url);
  }
  return null; // user cancelled
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data; // session is null until they confirm their email
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to login/logout events. Returns an unsubscribe function. */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}


const MIGRATION_KEY = 'device_data_migrated_v1';

/**
 * One-time move of anonymous device data (swipes, library, favorites, chat)
 * onto the newly signed-in account, so nothing is lost at first login.
 */
export async function migrateDeviceDataToUser(authUserId: string): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (done === authUserId) return;
    const deviceId = await getDeviceUserId();
    if (!deviceId || deviceId === authUserId) return;
    const tables = ['swipes', 'saved', 'preferences', 'favorites', 'chat_messages'];
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .update({ user_id: authUserId })
        .eq('user_id', deviceId);
      if (error) console.warn(`[migrate] ${table}: ${error.message}`);
    }
    await AsyncStorage.setItem(MIGRATION_KEY, authUserId);
  } catch (e) {
    console.warn('[migrate] failed', e);
  }
}

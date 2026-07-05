import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { USE_MOCK_DATA } from '@/config';

// Set these in a .env file (see .env.example) once you're ready to move
// off mock data. Never commit real keys.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// In mock mode we deliberately avoid constructing a real client against
// an empty URL (the Supabase SDK throws on an invalid URL). Everything
// that would call `supabase` is already routed to mock data in
// animeRepository.ts, so this client is inert until mock mode is off.
export const supabase = USE_MOCK_DATA
  ? (createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: { storage: AsyncStorage, autoRefreshToken: false, persistSession: false },
    }) as ReturnType<typeof createClient>)
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

if (!USE_MOCK_DATA && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project credentials, ' +
      'or set EXPO_PUBLIC_USE_MOCK_DATA=true to keep using mock data.'
  );
}

/**
 * Central switch for backend mode.
 *
 * MOCK MODE (default): everything runs on local data in src/data/mockAnime.ts.
 * No Supabase project, no .env file, no OpenAI key needed. This is what lets
 * you drop the project into Expo Snack and test on your phone immediately.
 *
 * To switch to your real backend once it's set up: set
 * EXPO_PUBLIC_USE_MOCK_DATA=false in your .env (or just flip the fallback
 * below), and make sure EXPO_PUBLIC_SUPABASE_URL / ANON_KEY are set.
 */
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA !== 'false';

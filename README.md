# AnimeSwipe AI

Tinder-style anime discovery app. Dark mode, swipe-based recommendations, AI-powered explanations.

**This build runs entirely on mock data by default — no Supabase project,
no OpenAI key, no `.env` file needed to test it.** Everything (swipe deck,
recommendation scoring, AI explanations/search/compare, saved list, stats)
works standalone with 15 sample anime baked in.

## Fastest way to test on your iPhone (no computer needed)

1. Install **Expo Go** from the App Store.
2. On any browser, go to **snack.expo.dev**.
3. In the Snack file panel, recreate this project's file structure (or use
   "Import from GitHub" if you push this to a repo — that's the faster way
   if you're doing this more than once).
4. Scan the QR code Snack shows you with your iPhone's camera — it opens
   directly in Expo Go and runs live.

This is the right tool because Snack runs the actual Expo/React Native
runtime in the browser and streams it to Expo Go on your phone — it's not
just a preview, it's the real app.

## Alternative: with a computer

```bash
cd animeswipe-ai
npm install
npx expo start
```
Then scan the QR code from the terminal with Expo Go, same as above.

## What's fully working right now

- **Full navigation flow:** Splash → Login → Onboarding → Swipe/Search/Saved/Profile tabs
- **Swipe screen:** real gesture physics (drag, rotate, fling, LIKE/PASS stamps), tap a card to open full details
- **Recommendation engine:** genre-affinity scoring that updates on every swipe, match % shown live
- **Anime Details:** description, AI explanation, details table, similar anime carousel, streaming buttons
- **AI Search:** natural-language search bar with suggestion chips (mock keyword matcher standing in for the real OpenAI call)
- **Saved List:** 5 tabs (Watching / Completed / Plan to Watch / Favorites / Dropped), tap ♥ or + Save anywhere to populate it
- **Profile:** stats computed live from your swipe history, favorite genres/studios, badge grid
- **Filters screen:** all filter categories from the spec (genre, type, status, language, studio, platform) — UI is complete; wiring filters into the deck query is the next step

## Not yet wired to a real backend (by design, for this milestone)

- Login buttons advance the flow but don't call real Supabase Auth yet
- The 15 mock anime aren't from a real metadata API (AniList/MAL) yet
- AI explanations/search/compare use local logic, not a real OpenAI call
- Filters screen doesn't yet filter the actual swipe deck

## Switching to your real backend later

Everything is already split so this is a flag flip, not a rewrite:

1. Set up Supabase (project + the 5 tables: `users`, `anime`, `swipes`, `saved`, `preferences`)
2. Copy `.env.example` → `.env`, fill in your Supabase URL/key
3. Set `EXPO_PUBLIC_USE_MOCK_DATA=false` in `.env`
4. Deploy a small Supabase Edge Function that holds your OpenAI key server-side and forwards to `/explain`, `/search`, `/compare` — point `EXPO_PUBLIC_AI_PROXY_URL` at it

Every function in `src/services/` already has both code paths (mock + real)
written — flipping the flag is all that's needed.

## Project structure

```
App.tsx                    Root: fonts, splash, context provider, navigator
src/
  state/AppContext.tsx      Shared app state: user, preferences, saved list, stats
  navigation/               Stack + bottom tab navigators
  screens/                  One file per screen (9 screens, matches spec)
  components/               SwipeCard, action buttons
  hooks/useSwipeDeck.ts     Deck state + scoring + persistence
  services/                 Data access, AI (mock + real), recommendation engine
  data/mockAnime.ts         15 sample anime for testing without a backend
  theme/tokens.ts           Design tokens (colors, type, spacing) from your icon
  types/                    Shared TypeScript types
```

## Test checklist

- [ ] Splash → Login → Onboarding → lands on Swipe tab with cards visible
- [ ] Swipe left/right (or tap ✕/♥) advances the deck, match % changes based on your onboarding genres
- [ ] Tap a card → opens Details with AI explanation, similar anime, streaming buttons
- [ ] Save something from Details → shows up in the Saved tab under "Plan to Watch"
- [ ] Search tab → tap a suggestion chip → get results → tap one → opens Details
- [ ] Profile tab → stats update after you've swiped right on a few anime
- [ ] Filters (gear icon on Swipe screen) → opens, all chips selectable, Apply closes it

## Next milestone (proposed)

1. Wire filters into the actual deck query
2. Real Supabase Auth (Google/Apple/Email)
3. Swap mock anime for a real AniList/MAL API integration
4. Deploy the `ai-proxy` Edge Function for real OpenAI-backed explanations/search

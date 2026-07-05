/**
 * Design tokens for AnimeSwipe AI.
 * Palette is derived directly from the app icon: near-black base,
 * a violet/purple "hero card" gradient, a pink brand accent (from the
 * "SWIPE" wordmark), and semantic green/red for like/pass actions.
 */

export const colors = {
  // Base surfaces
  background: '#0B0B10',
  surface: '#16151C',
  surfaceElevated: '#1F1E27',
  surfaceGlass: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',

  // Brand gradient (violet card in the icon)
  violetDeep: '#3A1F7A',
  violetCore: '#6C3CE9',
  violetLight: '#9B7BF5',

  // Wordmark accent (pink -> purple gradient in "SWIPE")
  pink: '#FF3D77',
  pinkToPurple: ['#FF3D77', '#9B4DFF'] as const,

  // Action semantics (X and heart cards)
  like: '#2ED47A',
  likeGlow: 'rgba(46,212,122,0.35)',
  pass: '#FF4B5C',
  passGlow: 'rgba(255,75,92,0.35)',

  // Text
  textPrimary: '#F5F4F8',
  textSecondary: '#A6A3B3',
  textTertiary: '#6E6B7C',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.55)',
};

export const gradients = {
  heroCard: ['#2A1858', '#6C3CE9', '#B79CF2'] as const,
  wordmark: ['#FF3D77', '#9B4DFF'] as const,
  screenFade: ['transparent', 'rgba(11,11,16,0.9)'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const typography = {
  // Display face for the wordmark / headlines: bold, tight, geometric
  display: {
    fontFamily: 'Sora_700Bold',
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: 'Sora_600SemiBold',
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: 'Inter_400Regular',
  },
  bodyMedium: {
    fontFamily: 'Inter_500Medium',
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.2,
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  }),
};

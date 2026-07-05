export type SwipeDirection = 'left' | 'right';

export type WatchStatus = 'watching' | 'completed' | 'plan_to_watch' | 'favorites' | 'dropped';

export interface Anime {
  id: string;
  title: string;
  description: string;
  genres: string[];
  episodes: number;
  studio: string;
  trailerUrl?: string;
  trailerYouTubeId?: string;
  posterUrl: string;
  rating: number; // 0-10
  releaseYear: number;
  status: 'airing' | 'finished';
  rawStatus?: string; // FINISHED | RELEASING | NOT_YET_RELEASED | HIATUS | CANCELLED
  format?: string; // TV | MOVIE | OVA | ONA | SPECIAL
  runtimeMinutes: number;
  ageRating?: string;
  streaming?: StreamingLink[];
  nextAiring?: { episode: number; airingAt: string };
}

export interface StreamingLink {
  platform: string;
  url: string;
}

export interface MatchResult {
  animeId: string;
  matchPercent: number; // 0-100
  reasons: string[];
  aiExplanation?: string;
}

export interface Swipe {
  userId: string;
  animeId: string;
  direction: SwipeDirection;
  timestamp: string;
}

export interface SavedAnime {
  userId: string;
  animeId: string;
  status: WatchStatus;
  savedAt: string;
}

export interface UserPreferences {
  favoriteGenres: string[];
  likedAnime: string[];
  dislikedGenres: string[];
  dubOrSub: 'dub' | 'sub' | 'either';
  moviesOrSeries: 'movies' | 'series' | 'either';
  maxEpisodes?: number;
  ongoingOrFinished: 'ongoing' | 'finished' | 'either';
  favoriteProtagonists?: string[];
  favoriteArtStyle?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  stats: UserStats;
}

export interface UserStats {
  animeWatched: number;
  animeLiked: number;
  animeSkipped: number;
  favoriteGenres: string[];
  favoriteStudios: string[];
  watchStreakDays: number;
  hoursWatched: number;
}

export interface FilterOptions {
  genres?: string[];
  minPopularity?: number;
  releaseYearRange?: [number, number];
  type?: 'movie' | 'series' | 'either';
  status?: 'finished' | 'airing' | 'either';
  maxEpisodes?: number;
  language?: 'dub' | 'sub' | 'either';
  minRating?: number;
  studio?: string;
  platform?: string;
}

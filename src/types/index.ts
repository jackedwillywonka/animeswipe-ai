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
  posterUrl: string;
  rating: number; // 0-10 from metadata source
  releaseYear: number;
  status: 'airing' | 'finished';
  runtimeMinutes: number;
  ageRating?: string;
  streaming?: StreamingLink[];
}

export interface StreamingLink {
  platform: 'Crunchyroll' | 'Netflix' | 'Hulu' | 'Funimation' | string;
  url: string;
}

export interface MatchResult {
  animeId: string;
  matchPercent: number; // 0-100
  reasons: string[]; // e.g. ["Action", "Dark Fantasy", "OP Main Character"]
  aiExplanation?: string; // full natural-language "why we recommended this"
}

export interface Swipe {
  userId: string;
  animeId: string;
  direction: SwipeDirection;
  timestamp: string; // ISO 8601
}

export interface SavedAnime {
  userId: string;
  animeId: string;
  status: WatchStatus;
  savedAt: string;
}

export interface UserPreferences {
  favoriteGenres: string[];
  likedAnime: string[]; // anime ids
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

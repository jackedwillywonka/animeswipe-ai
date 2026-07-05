import type { Anime } from '@/types';

/**
 * Local mock dataset. Lets the entire app be tested end-to-end
 * (Expo Snack, Expo Go, simulator) with zero backend setup.
 *
 * Poster images are neutral placeholders (not real copyrighted key art) -
 * swap in real poster URLs from your metadata provider (AniList/MAL) once
 * `EXPO_PUBLIC_USE_MOCK_DATA=false` and Supabase is wired up.
 */

function placeholderPoster(seed: string, colorHex: string) {
  return `https://placehold.co/600x900/${colorHex}/FFFFFF/png?text=${encodeURIComponent(seed)}&font=roboto`;
}

export const MOCK_ANIME: Anime[] = [
  {
    id: 'a1',
    title: 'Solo Leveling',
    description:
      'The weakest hunter alive gains a mysterious system that lets him grow stronger with every battle, and slowly becomes the most powerful being on Earth.',
    genres: ['Action', 'Fantasy', 'Dark Fantasy'],
    episodes: 12,
    studio: 'A-1 Pictures',
    posterUrl: placeholderPoster('Solo Leveling', '2A1858'),
    rating: 8.6,
    releaseYear: 2024,
    status: 'airing',
    runtimeMinutes: 24,
    ageRating: '16+',
    streaming: [{ platform: 'Crunchyroll', url: 'https://crunchyroll.com' }],
  },
  {
    id: 'a2',
    title: 'Jujutsu Kaisen',
    description:
      'A high schooler swallows a cursed talisman to save his friends and becomes host to one of the most powerful curses in existence.',
    genres: ['Action', 'Dark Fantasy', 'Supernatural'],
    episodes: 24,
    studio: 'MAPPA',
    posterUrl: placeholderPoster('Jujutsu Kaisen', '6C3CE9'),
    rating: 8.8,
    releaseYear: 2020,
    status: 'finished',
    runtimeMinutes: 24,
    ageRating: '17+',
    streaming: [{ platform: 'Crunchyroll', url: 'https://crunchyroll.com' }],
  },
  {
    id: 'a3',
    title: 'Attack on Titan',
    description:
      'Humanity fights for survival against giant humanoid Titans behind the last walled city on Earth.',
    genres: ['Action', 'Drama', 'Dark Fantasy'],
    episodes: 87,
    studio: 'WIT Studio / MAPPA',
    posterUrl: placeholderPoster('Attack on Titan', '9B7BF5'),
    rating: 9.0,
    releaseYear: 2013,
    status: 'finished',
    runtimeMinutes: 24,
    ageRating: '17+',
    streaming: [{ platform: 'Hulu', url: 'https://hulu.com' }],
  },
  {
    id: 'a4',
    title: 'Kaiju No. 8',
    description:
      'A man who cleans up after kaiju attacks gets the power to transform into a kaiju himself and joins the defense force he once dreamed of.',
    genres: ['Action', 'Sci-Fi'],
    episodes: 12,
    studio: 'Production I.G',
    posterUrl: placeholderPoster('Kaiju No. 8', '3A1F7A'),
    rating: 8.0,
    releaseYear: 2024,
    status: 'finished',
    runtimeMinutes: 24,
    streaming: [{ platform: 'Crunchyroll', url: 'https://crunchyroll.com' }],
  },
  {
    id: 'a5',
    title: "Hell's Paradise",
    description:
      'A death-row ninja is offered a shot at freedom if he can retrieve the elixir of life from a mysterious, monster-filled island.',
    genres: ['Action', 'Dark Fantasy', 'Horror'],
    episodes: 13,
    studio: 'MAPPA',
    posterUrl: placeholderPoster("Hell's Paradise", '1F1E27'),
    rating: 7.8,
    releaseYear: 2023,
    status: 'finished',
    runtimeMinutes: 24,
    ageRating: '17+',
  },
  {
    id: 'a6',
    title: 'Chainsaw Man',
    description:
      'A young devil hunter merges with his pet devil to become Chainsaw Man, navigating a brutal and darkly comic underworld.',
    genres: ['Action', 'Horror', 'Dark Fantasy'],
    episodes: 12,
    studio: 'MAPPA',
    posterUrl: placeholderPoster('Chainsaw Man', 'FF3D77'),
    rating: 8.5,
    releaseYear: 2022,
    status: 'finished',
    runtimeMinutes: 24,
    ageRating: '17+',
    streaming: [{ platform: 'Crunchyroll', url: 'https://crunchyroll.com' }],
  },
  {
    id: 'a7',
    title: 'Frieren: Beyond Journey\'s End',
    description:
      'An elf mage who outlives her adventuring party reflects on mortality and connection as she takes on a new apprentice decades later.',
    genres: ['Fantasy', 'Drama', 'Adventure'],
    episodes: 28,
    studio: 'Madhouse',
    posterUrl: placeholderPoster('Frieren', '9B4DFF'),
    rating: 9.1,
    releaseYear: 2023,
    status: 'finished',
    runtimeMinutes: 24,
  },
  {
    id: 'a8',
    title: 'Death Note',
    description:
      'A genius student discovers a notebook that kills anyone whose name is written in it, and begins a cat-and-mouse game with an elite detective.',
    genres: ['Mystery', 'Drama', 'Dark Fantasy'],
    episodes: 37,
    studio: 'Madhouse',
    posterUrl: placeholderPoster('Death Note', '16151C'),
    rating: 9.0,
    releaseYear: 2006,
    status: 'finished',
    runtimeMinutes: 23,
    ageRating: '16+',
  },
  {
    id: 'a9',
    title: 'Your Lie in April',
    description:
      'A former piano prodigy who stopped hearing music after his mother\'s death is drawn back to it by a free-spirited violinist.',
    genres: ['Drama', 'Romance', 'Slice of Life'],
    episodes: 22,
    studio: 'A-1 Pictures',
    posterUrl: placeholderPoster('Your Lie in April', 'FF4B5C'),
    rating: 8.9,
    releaseYear: 2014,
    status: 'finished',
    runtimeMinutes: 23,
  },
  {
    id: 'a10',
    title: 'Spy x Family',
    description:
      'A spy, an assassin, and a telepath form a fake family, each hiding their true identity from one another while raising a daughter.',
    genres: ['Comedy', 'Action', 'Slice of Life'],
    episodes: 25,
    studio: 'WIT Studio / CloverWorks',
    posterUrl: placeholderPoster('Spy x Family', '2ED47A'),
    rating: 8.7,
    releaseYear: 2022,
    status: 'airing',
    runtimeMinutes: 24,
    streaming: [{ platform: 'Crunchyroll', url: 'https://crunchyroll.com' }],
  },
  {
    id: 'a11',
    title: 'Vinland Saga',
    description:
      'A young Viking driven by vengeance slowly confronts the cost of the violence that defined his childhood.',
    genres: ['Action', 'Drama', 'Adventure'],
    episodes: 24,
    studio: 'WIT Studio / MAPPA',
    posterUrl: placeholderPoster('Vinland Saga', '6E6B7C'),
    rating: 8.8,
    releaseYear: 2019,
    status: 'airing',
    runtimeMinutes: 24,
    ageRating: '17+',
  },
  {
    id: 'a12',
    title: 'A Silent Voice',
    description:
      'A former bully seeks redemption by reconnecting with the deaf classmate he once tormented.',
    genres: ['Drama', 'Romance'],
    episodes: 1,
    studio: 'Kyoto Animation',
    posterUrl: placeholderPoster('A Silent Voice', '3A1F7A'),
    rating: 8.9,
    releaseYear: 2016,
    status: 'finished',
    runtimeMinutes: 130,
  },
  {
    id: 'a13',
    title: 'Mob Psycho 100',
    description:
      'A psychic middle schooler tries to live a normal life while working an exorcism side job with a con-artist mentor.',
    genres: ['Action', 'Comedy', 'Supernatural'],
    episodes: 37,
    studio: 'Bones',
    posterUrl: placeholderPoster('Mob Psycho 100', '9B7BF5'),
    rating: 8.7,
    releaseYear: 2016,
    status: 'finished',
    runtimeMinutes: 24,
  },
  {
    id: 'a14',
    title: 'Violet Evergarden',
    description:
      'A former child soldier becomes a letter writer for hire, slowly learning to understand the emotions she was never taught.',
    genres: ['Drama', 'Slice of Life', 'Romance'],
    episodes: 13,
    studio: 'Kyoto Animation',
    posterUrl: placeholderPoster('Violet Evergarden', 'FF3D77'),
    rating: 8.9,
    releaseYear: 2018,
    status: 'finished',
    runtimeMinutes: 24,
  },
  {
    id: 'a15',
    title: 'One Punch Man',
    description:
      'A hero who can defeat any opponent with a single punch struggles with the crushing boredom of being unbeatable.',
    genres: ['Action', 'Comedy', 'Sci-Fi'],
    episodes: 24,
    studio: 'Madhouse',
    posterUrl: placeholderPoster('One Punch Man', '2A1858'),
    rating: 8.7,
    releaseYear: 2015,
    status: 'finished',
    runtimeMinutes: 24,
  },
];

export function getMockAnimeById(id: string): Anime | undefined {
  return MOCK_ANIME.find((a) => a.id === id);
}

export function getMockSimilarAnime(anime: Anime, limit = 6): Anime[] {
  return MOCK_ANIME.filter(
    (a) => a.id !== anime.id && a.genres.some((g) => anime.genres.includes(g))
  ).slice(0, limit);
}

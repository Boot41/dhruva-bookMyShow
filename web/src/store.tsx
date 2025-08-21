import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { City } from './Api/CitiesAPI';
import type { Theater } from './Api/TheatersAPI';
import type { Show } from './Api/ShowAPI';
import { getTheaters } from './Api/TheatersAPI';
import { getMovieShows } from './Api/ShowAPI';
import type { TokenResponse } from './Api/LoginAPI';

type Cached<T> = { data: T; ts: number };

type TheatersKey = string; // `${cityId}|${movieId}`
type ShowsKey = string; // `${movieId}|${theaterId}|${cityId}|${date}`

const TTL_MS = 2 * 60 * 1000; // 2 minutes

type User = {
  token: TokenResponse;
  email?: string;
  id?: number; // fetched via /auth/me
  first_name?: string;
  last_name?: string;
};

interface AppState {
  // UI selections (persisted)
  selectedCity: City | null;
  selectedDate: string | null; // YYYY-MM-DD
  selectedSeats: number[]; // seat numbers selected on SeatsPage
  setSelectedCity: (city: City | null) => void;
  clearSelectedCity: () => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedSeats: (seats: number[]) => void;
  clearSelectedSeats: () => void;

  // Auth (persisted)
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;

  // Caches (non-persisted)
  theatersCache: Record<TheatersKey, Cached<Theater[]> | undefined>;
  showsCache: Record<ShowsKey, Cached<Show[]> | undefined>;

  // In-flight maps to dedupe concurrent fetches
  inflightTheaters: Record<TheatersKey, Promise<Theater[]> | undefined>;
  inflightShows: Record<ShowsKey, Promise<Show[]> | undefined>;

  // Helpers
  fetchTheaters: (cityId: number, movieId: number) => Promise<Theater[]>;
  fetchShows: (
    movieId: number,
    theaterId: number,
    cityId: number,
    date?: string
  ) => Promise<Show[]>;
}

function theatersKey(cityId: number, movieId: number): TheatersKey {
  return `${cityId}|${movieId}`;
}

function showsKey(movieId: number, theaterId: number, cityId: number, date?: string): ShowsKey {
  return `${movieId}|${theaterId}|${cityId}|${date ?? ''}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedCity: null,
      selectedDate: null,
      selectedSeats: [],
      setSelectedCity: (city) => set({ selectedCity: city }),
      clearSelectedCity: () => set({ selectedCity: null }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedSeats: (seats) => set({ selectedSeats: seats }),
      clearSelectedSeats: () => set({ selectedSeats: [] }),

      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      isAuthenticated: () => !!get().user,

      theatersCache: {},
      showsCache: {},
      inflightTheaters: {},
      inflightShows: {},

      async fetchTheaters(cityId, movieId) {
        const k = theatersKey(cityId, movieId);
        const { theatersCache, inflightTheaters } = get();

        const cached = theatersCache[k];
        const now = Date.now();
        if (cached && now - cached.ts < TTL_MS) {
          return cached.data;
        }

        if (inflightTheaters[k]) return inflightTheaters[k]!;

        const p = getTheaters({ city_id: cityId, movie_id: movieId })
          .then((res) => {
            set((s) => ({ theatersCache: { ...s.theatersCache, [k]: { data: res, ts: Date.now() } } }));
            return res;
          })
          .finally(() => {
            set((s) => {
              const { [k]: _omit, ...rest } = s.inflightTheaters;
              return { inflightTheaters: rest } as Partial<AppState> as AppState;
            });
          });

        set((s) => ({ inflightTheaters: { ...s.inflightTheaters, [k]: p } }));
        return p;
      },

      async fetchShows(movieId, theaterId, cityId, date) {
        const k = showsKey(movieId, theaterId, cityId, date);
        const { showsCache, inflightShows } = get();
        const cached = showsCache[k];
        const now = Date.now();
        if (cached && now - cached.ts < TTL_MS) {
          return cached.data;
        }
        if (inflightShows[k]) return inflightShows[k]!;

        const p = getMovieShows(movieId, { theater_id: theaterId, city_id: cityId, date })
          .then((res) => {
            set((s) => ({ showsCache: { ...s.showsCache, [k]: { data: res, ts: Date.now() } } }));
            return res;
          })
          .finally(() => {
            set((s) => {
              const { [k]: _omit, ...rest } = s.inflightShows;
              return { inflightShows: rest } as Partial<AppState> as AppState;
            });
          });

        set((s) => ({ inflightShows: { ...s.inflightShows, [k]: p } }));
        return p;
      },
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        selectedCity: state.selectedCity,
        selectedDate: state.selectedDate,
        selectedSeats: state.selectedSeats,
        user: state.user,
      }),
    }
  )
);
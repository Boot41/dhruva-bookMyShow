const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

import { ApiError } from "./CitiesAPI";
import { useAppStore } from "../store";

export type Show = {
  id: number;
  movie_id: number;
  screen_id: number;
  show_date: string; // ISO date (YYYY-MM-DD)
  show_time: string; // HH:MM:SS
  base_price: number;
  available_seats: number;
};

type GetMovieShowsParams = {
  date?: string; // YYYY-MM-DD
  theater_id?: number;
  city_id?: number; // override; otherwise taken from store
};

/**
 * Calls GET /movies/{movie_id}/shows?city_id=...&date=...&theater_id=...
 * Returns Show[]
 */
export async function getMovieShows(
  movieId: number,
  params: GetMovieShowsParams = {}
): Promise<Show[]> {
  const stateCityId = useAppStore.getState().selectedCity?.id;
  const city_id = params.city_id ?? stateCityId;

  if (!city_id) {
    throw new ApiError("City not selected", 400);
  }

  const query = new URLSearchParams();
  query.set("city_id", String(city_id));
  if (params.date) query.set("date", params.date);
  if (params.theater_id != null) query.set("theater_id", String(params.theater_id));

  const res = await fetch(`${API_BASE_URL}/movies/${movieId}/shows?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to load shows";
    throw new ApiError(String(message), res.status, data);
  }

  if (!Array.isArray(data)) {
    throw new ApiError("Malformed shows response", res.status, data);
  }

  // Basic validation/normalization
  const shows = (data as any[]).filter(
    (s) =>
      s &&
      typeof s.id === "number" &&
      typeof s.movie_id === "number" &&
      typeof s.screen_id === "number" &&
      typeof s.show_date === "string" &&
      typeof s.show_time === "string" &&
      typeof s.base_price === "number" &&
      typeof s.available_seats === "number"
  ) as Show[];

  if (shows.length !== (data as any[]).length) {
    throw new ApiError("Malformed show item in response", res.status, data);
  }

  return shows;
}


/**
 * Calls GET /shows/{show_id}
 * Returns Show
 */
export async function getShow(showId: number): Promise<Show> {
  const res = await fetch(`${API_BASE_URL}/shows/${showId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to load show";
    throw new ApiError(String(message), res.status, data);
  }

  const s = data as any;
  if (
    !s ||
    typeof s.id !== "number" ||
    typeof s.movie_id !== "number" ||
    typeof s.screen_id !== "number" ||
    typeof s.show_date !== "string" ||
    typeof s.show_time !== "string" ||
    typeof s.base_price !== "number" ||
    typeof s.available_seats !== "number"
  ) {
    throw new ApiError("Malformed show response", res.status, data);
  }

  return s as Show;
}


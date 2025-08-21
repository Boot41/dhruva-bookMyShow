const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

import type { MovieOut } from "./MoviesApi";
import type { Theater } from "./TheatersAPI";
import { ApiError } from "./LoginAPI";

export type SearchResponse = {
  movies: MovieOut[];
  theaters: Theater[];
};

export async function unifiedSearch(params: {
  q: string;
  city_id?: number;
  limit_movies?: number;
  limit_theaters?: number;
  signal?: AbortSignal;
}): Promise<SearchResponse> {
  const sp = new URLSearchParams();
  sp.set("q", params.q);
  if (params.city_id != null) sp.set("city_id", String(params.city_id));
  if (params.limit_movies != null) sp.set("limit_movies", String(params.limit_movies));
  if (params.limit_theaters != null) sp.set("limit_theaters", String(params.limit_theaters));

  const res = await fetch(`${API_BASE_URL}/search?${sp.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: params.signal,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = (data as any)?.detail || "Search failed";
    throw new ApiError(String(message), res.status, data);
  }

  const payload = data as SearchResponse;
  return {
    movies: Array.isArray(payload.movies) ? payload.movies : [],
    theaters: Array.isArray(payload.theaters) ? payload.theaters : [],
  };
}

export const SearchAPI = { unifiedSearch };

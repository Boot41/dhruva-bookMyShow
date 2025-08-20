const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

import { ApiError } from "./LoginAPI";

export type MovieBase = {
  title: string;
  description?: string | null;
  duration_minutes: number;
  poster_url?: string | null;
};

export type MovieCreate = MovieBase;

export type MovieOut = MovieBase & {
  id: number;
};

/**
 * GET /movies
 * Returns MovieOut[]
 */
export async function listMovies(): Promise<MovieOut[]> {
  const res = await fetch(`${API_BASE_URL}/movies`, {
    method: "GET",
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to fetch movies";
    throw new ApiError(String(message), res.status, data);
  }

  return data as MovieOut[];
}

/**
 * GET /movies/{movie_id}
 * Returns MovieOut
 */
export async function getMovie(movieId: number): Promise<MovieOut> {
  const res = await fetch(`${API_BASE_URL}/movies/${movieId}`, {
    method: "GET",
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to fetch movie";
    throw new ApiError(String(message), res.status, data);
  }

  return data as MovieOut;
}

export const MoviesApi = {
  listMovies,
  getMovie,
  createMovie,
};

/**
 * POST /movies (requires Bearer token)
 * Body: MovieCreate
 * Returns MovieOut
 */
export async function createMovie(
  movie: MovieCreate,
  accessToken: string
): Promise<MovieOut> {
  const res = await fetch(`${API_BASE_URL}/movies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(movie),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to create movie";
    throw new ApiError(String(message), res.status, data);
  }

  return data as MovieOut;
}

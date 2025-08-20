const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

import { ApiError } from "./CitiesAPI";
import { useAppStore } from "../store";

export type Theater = {
  id: number;
  name: string;
  address: string;
};

export type GetTheatersParams = {
  city_id?: number; // if omitted, taken from store
  movie_id?: number; // optional filter by movie
  latitude?: number; // accepted by backend but currently unused
  longitude?: number; // accepted by backend but currently unused
};

/**
 * Calls GET /theaters?city_id=...&movie_id=...&latitude=...&longitude=...
 * Returns Theater[]
 */
export async function getTheaters(
  params: GetTheatersParams = {}
): Promise<Theater[]> {
  const stateCityId = useAppStore.getState().selectedCity?.id;
  const city_id = params.city_id ?? stateCityId;

  if (!city_id) {
    throw new ApiError("City not selected", 400);
  }

  const query = new URLSearchParams();
  query.set("city_id", String(city_id));
  if (params.movie_id != null) query.set("movie_id", String(params.movie_id));
  if (params.latitude != null) query.set("latitude", String(params.latitude));
  if (params.longitude != null) query.set("longitude", String(params.longitude));

  const res = await fetch(`${API_BASE_URL}/theaters?${query.toString()}`, {
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
    const message = (data as any)?.detail || "Failed to load theaters";
    throw new ApiError(String(message), res.status, data);
  }

  if (!Array.isArray(data)) {
    throw new ApiError("Malformed theaters response", res.status, data);
  }

  const theaters = (data as any[]).filter(
    (t) =>
      t &&
      typeof t.id === "number" &&
      typeof t.name === "string" &&
      typeof t.address === "string"
  ) as Theater[];

  if (theaters.length !== (data as any[]).length) {
    throw new ApiError("Malformed theater item in response", res.status, data);
  }

  return theaters;
}

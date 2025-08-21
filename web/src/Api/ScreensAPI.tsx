const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

import { ApiError } from "./CitiesAPI";

export type Screen = {
  id: number;
  theater_id: number;
  name: string;
  screen_type?: string | null;
  total_seats: number;
  layout_config: any; // backend returns JSON; structure can vary
};

/**
 * Calls GET /theaters/{theater_id}/screens
 */
export async function listScreensForTheater(theaterId: number): Promise<Screen[]> {
  const res = await fetch(`${API_BASE_URL}/theaters/${theaterId}/screens`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to load screens";
    throw new ApiError(String(message), res.status, data);
  }

  if (!Array.isArray(data)) {
    throw new ApiError("Malformed screens response", res.status, data);
  }

  return data as Screen[];
}

/**
 * Calls GET /screens/{screen_id}
 */
export async function getScreen(screenId: number): Promise<Screen> {
  const res = await fetch(`${API_BASE_URL}/screens/${screenId}`, {
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
    const message = (data as any)?.detail || "Failed to load screen";
    throw new ApiError(String(message), res.status, data);
  }

  const s = data as any;
  if (
    !s ||
    typeof s.id !== "number" ||
    typeof s.theater_id !== "number" ||
    typeof s.name !== "string" ||
    typeof s.total_seats !== "number"
  ) {
    throw new ApiError("Malformed screen response", res.status, data);
  }

  return s as Screen;
}


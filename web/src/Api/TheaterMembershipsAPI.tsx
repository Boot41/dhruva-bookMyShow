const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

import { ApiError } from "./CitiesAPI";

export type TheaterUserMembership = {
  id: number;
  user_id: number;
  theater_id: number;
  role: string;
  permissions?: any | null;
  is_active: boolean;
  created_at: string;
};

export type ListMembershipsParams = {
  user_id?: number;
  theater_id?: number;
  is_active?: boolean;
};

/**
 * GET /theater-memberships?user_id=&theater_id=&is_active=
 */
export async function listTheaterMemberships(
  params: ListMembershipsParams = {}
): Promise<TheaterUserMembership[]> {
  const qs = new URLSearchParams();
  if (params.user_id != null) qs.set("user_id", String(params.user_id));
  if (params.theater_id != null) qs.set("theater_id", String(params.theater_id));
  if (params.is_active != null) qs.set("is_active", String(params.is_active));

  const url = `${API_BASE_URL}/theater-memberships${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to load theater memberships";
    throw new ApiError(String(message), res.status, data);
  }

  if (!Array.isArray(data)) {
    throw new ApiError("Malformed memberships response", res.status, data);
  }

  return data as TheaterUserMembership[];
}

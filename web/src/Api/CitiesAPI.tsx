const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type City = {
  id: number;
  name: string;
  state?: string | null;
  country: string;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Calls GET /cities
 * Returns City[]
 */
export async function fetchCities(): Promise<City[]> {
  const res = await fetch(`${API_BASE_URL}/cities`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors for non-JSON responses
  }

  if (!res.ok) {
    const message =
      (data as any)?.detail ||
      (typeof data === "string" ? data : "Failed to load cities");
    throw new ApiError(String(message), res.status, data);
  }

  // Basic shape validation
  if (!Array.isArray(data)) {
    throw new ApiError("Malformed cities response", res.status, data);
  }

  // Optionally ensure required fields exist on each item
  const cities = (data as any[]).filter(
    (c) => c && typeof c.id === "number" && typeof c.name === "string" && typeof c.country === "string"
  ) as City[];

  if (cities.length !== (data as any[]).length) {
    throw new ApiError("Malformed city item in response", res.status, data);
  }

  return cities;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type RegisterRequest = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
};

export type RegisterResponse = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
};
import { ApiError } from './LoginAPI';

/**
 * Calls POST /auth/register with user details
 * Returns created user object (no token)
 */
export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
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
      (typeof data === "string" ? data : "Registration failed");
    throw new ApiError(String(message), res.status, data);
  }

  // Basic shape validation
  const user = data as Partial<RegisterResponse>;
  if (!user?.id || !user?.email) {
    throw new ApiError("Malformed register response", res.status, data);
  }

  return user as RegisterResponse;
}

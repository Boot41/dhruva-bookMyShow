const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
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
 * Calls POST /auth/login with { email, password }
 * Returns { access_token, token_type }
 */
export async function login(req: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
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
      (typeof data === "string" ? data : "Login failed");
    throw new ApiError(String(message), res.status, data);
  }

  // Basic shape validation
  const token = data as Partial<TokenResponse>;
  if (!token?.access_token || !token?.token_type) {
    throw new ApiError("Malformed token response", res.status, data);
  }

  return token as TokenResponse;
}
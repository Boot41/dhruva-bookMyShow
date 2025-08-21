const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type BookingCreateReq = {
  show_id: number;
  seat_numbers: number[];
};

export type BookingOut = {
  id: number;
  user_id?: number | null;
  booking_type: string;
  show_id?: number | null;
  event_id?: number | null;
  booking_reference: string;
  final_amount: number;
  booking_status: string;
  created_at?: string | null;
};

// Booking Seats API types
export type BookingSeatsHoldRequest = {
  show_id: number;
  seat_numbers: number[];
};

export type BookingSeatsHoldResponse = {
  show_id: number;
  held_seat_numbers: number[];
  unavailable_seat_numbers: number[];
};

export type BookingSeatsStatusResponse = {
  show_id: number;
  unavailable_seat_numbers: number[];
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
 * POST /booking_seats to hold seats for a show.
 */
export async function holdBookingSeats(
  req: BookingSeatsHoldRequest
): Promise<BookingSeatsHoldResponse> {
  const res = await fetch(`${API_BASE_URL}/booking_seats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to hold seats";
    throw new ApiError(String(message), res.status, data);
  }

  return data as BookingSeatsHoldResponse;
}

/**
 * GET /shows/{show_id}/booking_seats to fetch unavailable seats for a show.
 */
export async function getBookingSeatsStatus(
  show_id: number
): Promise<BookingSeatsStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/shows/${show_id}/booking_seats`);

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = (data as any)?.detail || "Failed to fetch seat status";
    throw new ApiError(String(message), res.status, data);
  }

  return data as BookingSeatsStatusResponse;
}

/**
 * Calls POST /bookings with { show_id, seat_numbers }
 */
export async function createBooking(req: BookingCreateReq): Promise<BookingOut> {
  const res = await fetch(`${API_BASE_URL}/bookings`, {
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
    // ignore non-JSON
  }

  if (!res.ok) {
    const message = (data as any)?.detail ||
      (typeof data === "string" ? data : "Failed to create booking");
    throw new ApiError(String(message), res.status, data);
  }

  return data as BookingOut;
}

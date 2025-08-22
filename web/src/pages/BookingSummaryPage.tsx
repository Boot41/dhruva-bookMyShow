import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/header";
import { useAppStore } from "../store";
import { getShow, type Show } from "../Api/ShowAPI";
import { getScreen, type Screen } from "../Api/ScreensAPI";
import { getMovie, type MovieOut } from "../Api/MoviesApi";
import { createBooking, createBookingSeats } from "../Api/BookingsAPI";

export default function BookingSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const showId = useMemo(() => {
    const v = params.get("show_id");
    return v ? Number(v) : undefined;
  }, [params]);

  const selectedSeats = useAppStore((s) => s.selectedSeats);
  const user = useAppStore((s) => s.user);

  const [show, setShow] = useState<Show | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [movie, setMovie] = useState<MovieOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!showId) {
      setError("Missing show_id");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await getShow(showId);
        if (!active) return;
        setShow(s);
        const scr = await getScreen(s.screen_id);
        if (!active) return;
        setScreen(scr);
        // fetch movie title
        try {
          const mv = await getMovie(s.movie_id);
          if (active) setMovie(mv);
        } catch (_) {
          // ignore movie fetch failure for now
        }
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load summary");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [showId]);

  const total = useMemo(() => {
    if (!show) return 0;
    return (show.base_price || 0) * (selectedSeats.length || 0);
  }, [show, selectedSeats]);

  return (
    <div>
      <Header />
      <div className="px-4 md:px-6 lg:px-10 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button className="text-rose-600 hover:underline" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <span>/</span>
          <span>Booking Summary</span>
        </div>

        <h1 className="text-2xl font-semibold mt-3">{movie?.title ? movie.title : "Review your booking"}</h1>

        {loading && <div className="text-gray-600 mt-3">Loading…</div>}
        {error && <div className="text-red-600 mt-3">{error}</div>}

        {!loading && !error && (
          <div className="mt-4 space-y-4">
            {/* Show details */}
            {show && screen && (
              <div className="bg-white border rounded-md p-4">
                <div className="text-gray-800 font-medium">Show Details</div>
                <div className="mt-2 text-sm text-gray-700">
                  {movie?.title && <div>Movie: {movie.title}</div>}
                  <div>Screen: {screen.name}{screen.screen_type ? ` · ${screen.screen_type}` : ""}</div>
                  <div>Date: {show.show_date}</div>
                  <div>Time: {show.show_time}</div>
                  <div>Base Price: ₹{show.base_price.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Seats */}
            <div className="bg-white border rounded-md p-4">
              <div className="text-gray-800 font-medium">Selected Seats</div>
              <div className="mt-2 text-sm text-gray-700">
                {selectedSeats.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map((s) => (
                      <span key={s} className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">Seat {s}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No seats selected.</div>
                )}
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-white border rounded-md p-4">
              <div className="text-gray-800 font-medium">Price Summary</div>
              <div className="mt-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Tickets ({selectedSeats.length})</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                {/* Placeholder taxes/fees could go here */}
              </div>
              <div className="mt-3 flex justify-between items-center">
                <div className="text-gray-900 font-semibold">Payable: ₹{total.toFixed(2)}</div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
                    onClick={() => navigate(`/seats?show_id=${showId}`)}
                  >
                    Edit Seats
                  </button>
                  <button
                    className="px-4 py-2 text-sm rounded bg-rose-600 text-white disabled:opacity-60"
                    disabled={selectedSeats.length === 0 || !showId || submitting || !user?.id}
                    onClick={async () => {
                      if (!showId) return;
                      if (!user?.id) {
                        setError("Please sign in to proceed with booking.");
                        return;
                      }
                      setSubmitting(true);
                      setError(null);
                      try {
                        const booking = await createBooking({ show_id: showId, seat_numbers: selectedSeats, user_id: user.id });
                        // Lock the seats against the created booking
                        try {
                          await createBookingSeats({
                            show_id: showId,
                            booking_id: booking.id,
                            seat_id: selectedSeats,
                          });
                        } catch (e: any) {
                          // If locking fails, surface error and stop further flow
                          throw new Error(e?.message || "Failed to lock seats for booking");
                        }
                        // Navigate home with a success toast
                        navigate('/', {
                          state: {
                            toast: {
                              type: 'success',
                              message: 'Booking confirmed',
                            },
                          },
                        });
                      } catch (e: any) {
                        setError(e?.message || "Failed to create booking");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {submitting ? "Creating…" : "Continue to Pay"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

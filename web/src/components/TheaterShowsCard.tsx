import { useEffect, useMemo, useState } from "react";
import type { Theater } from "../Api/TheatersAPI";
import type { Show } from "../Api/ShowAPI";
import { useAppStore } from "../store";

type Props = {
  theater: Theater;
  movieId: number;
  cityId?: number;
  date?: string; // YYYY-MM-DD, optional
  onSelectShow?: (show: Show) => void;
};

function formatTime(hms: string) {
  // Expect HH:MM:SS -> HH:MM
  const [hh, mm] = hms.split(":");
  return `${hh}:${mm}`;
}

function availabilityClass(seats: number) {
  if (seats <= 0) return "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed";
  if (seats < 50) return "border-amber-500 text-amber-700 hover:bg-amber-50"; // fast filling
  return "border-emerald-500 text-emerald-700 hover:bg-emerald-50"; // available
}

export default function TheaterShowsCard({ theater, movieId, cityId, date, onSelectShow }: Props) {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchShows = useAppStore((s) => s.fetchShows);

  const params = useMemo(() => ({ city_id: cityId, theater_id: theater.id, date }), [cityId, theater.id, date]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchShows(movieId, params.theater_id, params.city_id!, params.date);
        if (active) setShows(data);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load shows");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [movieId, params.city_id, params.theater_id, params.date, fetchShows]);

  return (
    <div className="p-4 border rounded-lg hover:shadow-sm transition bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-lg">{theater.name}</div>
          <div className="text-sm text-gray-600">{theater.address}</div>
        </div>
      </div>

      <div className="mt-3">
        {loading && <div className="text-gray-600 text-sm">Loading showtimes…</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!loading && !error && shows.length === 0 && (
          <div className="text-gray-600 text-sm">No showtimes available.</div>
        )}

        {shows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {shows.map((s) => {
              const baseCls = availabilityClass(s.available_seats);
              const disabled = s.available_seats <= 0;
              return (
                <button
                  key={s.id}
                  className={`px-3 py-1.5 text-sm rounded-md border transition ${baseCls}`}
                  onClick={() => !disabled && onSelectShow?.(s)}
                  disabled={disabled}
                  title={`Available: ${s.available_seats} | Base: ₹${s.base_price}`}
                >
                  {formatTime(s.show_time)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

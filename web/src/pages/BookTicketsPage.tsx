import { useEffect, useMemo, useState } from "react";
import Header from "../components/header";
import { useLocation, useNavigate } from "react-router-dom";
import type { Theater } from "../Api/TheatersAPI";
import { useAppStore } from "../store";
import TheaterShowsCard from "../components/TheaterShowsCard";
import DateStrip from "../components/DateStrip";

export default function BookTicketsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedDateInStore = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const fetchTheaters = useAppStore((s) => s.fetchTheaters);
  const fetchShows = useAppStore((s) => s.fetchShows);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const movieId = useMemo(() => {
    const v = params.get("movie_id");
    return v ? Number(v) : undefined;
  }, [params]);
  const cityIdFromUrl = useMemo(() => {
    const v = params.get("city_id");
    return v ? Number(v) : undefined;
  }, [params]);

  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = useMemo(() => params.get("date") || selectedDateInStore || undefined, [params, selectedDateInStore]);

  useEffect(() => {
    let active = true;

    // Validate params
    if (!movieId) {
      setError("Missing movie_id");
      return;
    }

    const effectiveCityId = cityIdFromUrl ?? selectedCity?.id;
    if (!effectiveCityId) {
      setError("City not selected");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTheaters(effectiveCityId, movieId);
        // For the selected date, filter theaters that have at least one show (using cached helper)
        const results = await Promise.all(
          data.map(async (t) => {
            try {
              const shows = await fetchShows(movieId, t.id, effectiveCityId, date);
              return { theater: t, hasShows: Array.isArray(shows) && shows.length > 0 };
            } catch {
              return { theater: t, hasShows: false };
            }
          })
        );
        const filtered = results.filter((r) => r.hasShows).map((r) => r.theater);
        if (active) setTheaters(filtered);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load theaters");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [movieId, cityIdFromUrl, selectedCity?.id, date, fetchTheaters, fetchShows]);

  return (
    <div>
      <Header />

      <div className="px-4 md:px-6 lg:px-10 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button className="text-rose-600 hover:underline" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <span>/</span>
          <span>Book Tickets</span>
        </div>

        <h1 className="text-2xl font-semibold mt-3">Select a theater</h1>
        {selectedCity?.name && (
          <p className="text-gray-600">City: {selectedCity.name}</p>
        )}

        {/* Date filter strip */}
        <div className="mt-3">
          <DateStrip
            selected={date}
            days={7}
            onChange={(newDate) => {
              const sp = new URLSearchParams(location.search);
              if (newDate) sp.set("date", newDate);
              else sp.delete("date");
              navigate({ pathname: "/book", search: `?${sp.toString()}` }, { replace: true });
              setSelectedDate(newDate ?? null);
            }}
          />
        </div>

        <div className="mt-4 space-y-3">
          {loading && <div className="text-gray-600">Loading theaters…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && theaters.length === 0 && (
            <div className="text-gray-600">No shows available yet.</div>
          )}

          {!loading && !error && theaters.map((t) => (
            <TheaterShowsCard
              key={t.id}
              theater={t}
              movieId={movieId!}
              cityId={cityIdFromUrl ?? selectedCity?.id}
              date={date}
              onSelectShow={(show) => {
                navigate(`/seats?show_id=${show.id}`);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

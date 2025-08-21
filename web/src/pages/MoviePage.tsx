import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/header";
import { MoviesApi, type MovieOut } from "../Api/MoviesApi";
import { useAppStore } from "../store";
import CitySelectorDialog from "../components/CitySelectorDialog";
import DateStrip from "../components/DateStrip";
import TheaterShowsCard from "../components/TheaterShowsCard";
import type { Theater } from "../Api/TheatersAPI";
import MovieHero from "../layout/MovieHero";

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const movieId = useMemo(() => (id ? Number(id) : undefined), [id]);
  const navigate = useNavigate();

  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedDateInStore = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const fetchTheaters = useAppStore((s) => s.fetchTheaters);
  const fetchShows = useAppStore((s) => s.fetchShows);

  const [movie, setMovie] = useState<MovieOut | null>(null);
  const [loadingMovie, setLoadingMovie] = useState(false);
  const [movieError, setMovieError] = useState<string | null>(null);

  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loadingTheaters, setLoadingTheaters] = useState(false);
  const [theatersError, setTheatersError] = useState<string | null>(null);

  const [cityDialogOpen, setCityDialogOpen] = useState(!selectedCity);
  const [date, setDate] = useState<string | undefined>(selectedDateInStore || undefined);

  useEffect(() => setCityDialogOpen(!selectedCity), [selectedCity]);

  // Fetch movie details
  useEffect(() => {
    let active = true;
    if (!movieId) return;
    (async () => {
      setLoadingMovie(true);
      setMovieError(null);
      try {
        const m = await MoviesApi.getMovie(movieId);
        if (active) setMovie(m);
      } catch (e: any) {
        if (active) setMovieError(e?.message || "Failed to load movie");
      } finally {
        if (active) setLoadingMovie(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [movieId]);

  // Fetch theaters for this movie in selected city
  useEffect(() => {
    let active = true;
    if (!movieId || !selectedCity?.id) return;
    (async () => {
      setLoadingTheaters(true);
      setTheatersError(null);
      try {
        const data = await fetchTheaters(selectedCity.id, movieId);
        // Optional: filter only theaters that have shows today/selected date
        const results = await Promise.all(
          data.map(async (t) => {
            try {
              const shows = await fetchShows(movieId, t.id, selectedCity.id, date);
              return { theater: t, hasShows: Array.isArray(shows) && shows.length > 0 };
            } catch {
              return { theater: t, hasShows: false };
            }
          })
        );
        const filtered = results.filter((r) => r.hasShows).map((r) => r.theater);
        if (active) setTheaters(filtered);
      } catch (e: any) {
        if (active) setTheatersError(e?.message || "Failed to load theaters");
      } finally {
        if (active) setLoadingTheaters(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [movieId, selectedCity?.id, date, fetchTheaters, fetchShows]);

  const genres = Array.isArray((movie as any)?.genres) ? (movie as any)?.genres?.join(" / ") : undefined;

  return (
    <div>
      <Header enableCitySelect />

      <CitySelectorDialog
        open={cityDialogOpen}
        onClose={() => setCityDialogOpen(false)}
        onSelect={() => setCityDialogOpen(false)}
        title="Select your city"
      />

      <div className="px-4 md:px-6 lg:px-10 py-5">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <button className="text-rose-600 hover:underline" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <span>/</span>
          <span>Movie</span>
        </div>

        {/* Movie hero */}
        <div>
          {loadingMovie && <div className="text-gray-600">Loading movie…</div>}
          {movieError && <div className="text-red-600">{movieError}</div>}
          {movie && (
            <MovieHero
              posterUrl={movie.poster_url ?? undefined}
              title={movie.title}
              pills={[
                ...(movie.language ? [movie.language] : []),
                ...(typeof movie.duration_minutes === "number" ? [`${movie.duration_minutes} mins`] : []),
                ...(genres ? [genres] : []),
                ...(((movie as any).release_date) ? [new Date((movie as any).release_date).toDateString()] : []),
              ]}
              description={movie.description || undefined}
            >
              <button
                className="px-4 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={!selectedCity}
                onClick={() => {
                  if (!movieId || !selectedCity?.id) return;
                  const sp = new URLSearchParams();
                  sp.set("movie_id", String(movieId));
                  sp.set("city_id", String(selectedCity.id));
                  if (date) sp.set("date", date);
                  navigate({ pathname: "/book", search: `?${sp.toString()}` });
                }}
              >
                Book Tickets
              </button>
            </MovieHero>
          )}
        </div>

        {/* Date selector */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Showtimes</h2>
          <DateStrip
            selected={date}
            days={7}
            onChange={(newDate) => {
              setDate(newDate);
              setSelectedDate(newDate ?? null);
            }}
          />
        </div>

        {/* Theaters and shows */}
        <div className="mt-4 space-y-3">
          {!selectedCity && (
            <div className="text-gray-700">Select a city to see showtimes.</div>
          )}
          {selectedCity && loadingTheaters && <div className="text-gray-600">Loading theaters…</div>}
          {selectedCity && theatersError && <div className="text-red-600">{theatersError}</div>}
          {selectedCity && !loadingTheaters && !theatersError && theaters.length === 0 && (
            <div className="text-gray-600">No showtimes available.</div>
          )}

          {selectedCity && theaters.map((t) => (
            <TheaterShowsCard
              key={t.id}
              theater={t}
              movieId={movieId!}
              cityId={selectedCity.id}
              date={date}
              onSelectShow={(show) => navigate(`/seats?show_id=${show.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

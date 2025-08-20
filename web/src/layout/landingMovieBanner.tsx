import React, { useEffect, useMemo, useState } from "react";
import LandingPageMovieCard from "../components/LandingPageMovieCard";
import { MoviesApi, type MovieOut } from "../Api/MoviesApi";
import { useAppStore } from "../store";
import { useNavigate } from "react-router-dom";

export default function LandingMovieBanner() {
  const selectedCity = useAppStore((s) => s.selectedCity);
  const [movies, setMovies] = useState<MovieOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const cityId = selectedCity?.id;

  useEffect(() => {
    let active = true;
    if (!cityId) {
      setMovies([]);
      setError(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await MoviesApi.listPlayingMovies(cityId);
        if (active) setMovies(data);
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load movies");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [cityId]);

  const content = useMemo(() => {
    if (!cityId) {
      return (
        <div className="text-gray-600 text-sm">
          Select a city to see recommended movies.
        </div>
      );
    }
    if (loading) return <div className="text-gray-600 text-sm">Loading…</div>;
    if (error) return <div className="text-red-600 text-sm">{error}</div>;
    if (movies.length === 0)
      return <div className="text-gray-600 text-sm">No movies found.</div>;

    return (
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
        {movies.map((m) => (
          <div key={m.id} className="snap-start">
            <LandingPageMovieCard
              movie={m}
              onClick={() => {
                if (!cityId) return;
                navigate(`/book?movie_id=${m.id}&city_id=${cityId}`);
              }}
            />
          </div>
        ))}
      </div>
    );
  }, [cityId, loading, error, movies]);

  return (
    <section className="px-4 md:px-6 lg:px-10 mt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl md:text-2xl font-semibold mb-3">
          Recommended Movies
        </h2>
        <a href="#" className="text-sm text-rose-600 hover:text-rose-700">
          See All &gt;
        </a>
      </div>

      {content}
    </section>
  );
}
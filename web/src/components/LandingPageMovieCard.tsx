import type { MovieOut } from "../Api/MoviesApi";

type Props = {
  movie: MovieOut;
  className?: string;
  onClick?: () => void;
};

function formatVotes(n?: number) {
  if (!n && n !== 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M Votes`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K Votes`;
  return `${n} Votes`;
}

export default function LandingPageMovieCard({ movie, className = "", onClick }: Props) {
  const genres =
    Array.isArray((movie as any).genres) && (movie as any).genres.length > 0
      ? (movie as any).genres.join("/")
      : null;

  const rating = (movie as any).rating as number | undefined;
  const voteCount = (movie as any).vote_count as number | undefined;

  // Poster fallback
  const poster = movie.poster_url || "";

  return (
    <div
      className={`w-[210px] flex-shrink-0 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="relative">
        <div
          className="rounded-xl overflow-hidden aspect-[2/3] bg-gray-200 bg-center bg-cover flex items-center justify-center"
          style={poster ? { backgroundImage: `url(${poster})` } : undefined}
          aria-label={movie.title}
          role="img"
        >
          {!poster && (
            <div className="h-full w-full flex items-center justify-center text-gray-500">
              No Image
            </div>
          )}
        </div>

        {typeof rating === "number" && (
          <div className="absolute left-2 bottom-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
            <span className="text-red-400">★</span>
            <span className="font-semibold">{rating.toFixed(1)}/10</span>
            {typeof voteCount === "number" && (
              <span className="text-gray-300 ml-1">{formatVotes(voteCount)}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="text-[15px] font-semibold leading-snug line-clamp-2">
          {movie.title}
        </h3>
        {genres && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{genres}</p>
        )}
      </div>
    </div>
  );
}
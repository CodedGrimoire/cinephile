"use client";

import { useEffect, useState, type ReactNode } from "react";
import MovieCard from "./MovieCard";
import { featuredMoviesFetcher, type Movie, type ReleaseCatalogueMovie } from "./FeaturedMoviesFetcher";

type UpcomingMovie = ReleaseCatalogueMovie & { details?: Movie };

type Props = {
  onMovieClick: (movie: Movie) => void;
  onAddToList: (movie: Movie) => void;
};

export default function MovieDiscoverySections({ onMovieClick, onAddToList }: Props) {
  const [yearMovies, setYearMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<UpcomingMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      featuredMoviesFetcher.getMoviesByYear(year, 7.5, 12),
      featuredMoviesFetcher.getUpcomingMovies(12),
    ]).then(([released, upcoming]) => {
      if (!active) return;
      setYearMovies(released);
      setUpcomingMovies(upcoming);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : "Movie releases are temporarily unavailable.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [year]);

  const renderLoading = () => loading && <p className="text-white/65 py-8">Loading release listings…</p>;

  return (
    <section className="w-full max-w-7xl mx-auto mb-16 space-y-10" aria-label="New and upcoming movies">
      {error && <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-900/20 p-4 text-amber-100">{error}</p>}
      <ReleaseSection title={`Released in ${year}`} subtitle="Star Cineplex catalogue · sorted by IMDb rating">
        {renderLoading()}
        {!loading && !error && yearMovies.length === 0 && <Empty>There are no confidently matched, rated Star Cineplex titles released this year yet.</Empty>}
        {!loading && yearMovies.length > 0 && <MovieGrid movies={yearMovies} onMovieClick={onMovieClick} onAddToList={onAddToList} />}
      </ReleaseSection>

      <ReleaseSection title="Upcoming movies" subtitle="Future release dates listed in the Star Cineplex catalogue">
        {renderLoading()}
        {!loading && !error && upcomingMovies.length === 0 && <Empty>No upcoming release dates are listed right now.</Empty>}
        {!loading && upcomingMovies.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {upcomingMovies.map((movie) => movie.details ? (
              <div key={movie.providerMovieId} className="relative">
                <MovieCard movie={movie.details} onMovieClick={onMovieClick} onAddToList={onAddToList} showAddButton />
                <p className="text-center text-cyan-100 text-sm mt-2">Release date: {movie.releaseDate}</p>
              </div>
            ) : (
              <article key={movie.providerMovieId} className="rounded-xl border border-white/20 bg-white/10 p-5 text-center">
                <div className="mb-4 flex h-64 items-center justify-center rounded-lg bg-black/20 text-6xl" aria-hidden="true">🎬</div>
                <h3 className="text-xl font-semibold text-white">{movie.title}</h3>
                <p className="mt-2 text-cyan-100 text-sm">Release date: {movie.releaseDate}</p>
                <p className="mt-2 text-white/55 text-sm">IMDb details are not available for this title yet.</p>
              </article>
            ))}
          </div>
        )}
      </ReleaseSection>
      <p className="text-center text-white/45 text-xs">Release dates come from Star Cineplex. Ratings and movie details are shown only when OMDb confirms the title and year.</p>
    </section>
  );
}

function ReleaseSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/20 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-9">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Movie guide</p>
        <h2 className="text-2xl font-bold text-white md:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-white/60">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function MovieGrid({ movies, onMovieClick, onAddToList }: { movies: Movie[]; onMovieClick: (movie: Movie) => void; onAddToList: (movie: Movie) => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {movies.map((movie) => <MovieCard key={movie.imdbID} movie={movie} onMovieClick={onMovieClick} onAddToList={onAddToList} showAddButton />)}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-white/10 bg-black/10 p-5 text-white/65">{children}</p>;
}

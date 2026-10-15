"use client";

import { useEffect, useState, type ReactNode } from "react";
import MovieCard from "./MovieCard";
import { featuredMoviesFetcher, type Movie } from "./FeaturedMoviesFetcher";

type Props = {
  onMovieClick: (movie: Movie) => void;
  onAddToList: (movie: Movie) => void;
};

export default function MovieDiscoverySections({ onMovieClick, onAddToList }: Props) {
  const [released, setReleased] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric" }).format(new Date()));

  useEffect(() => {
    let active = true;
    Promise.all([
      featuredMoviesFetcher.getMoviesByYear(year, 7.5, 10),
      featuredMoviesFetcher.getUpcomingMovies(year + 1, 10),
    ]).then(([thisYear, nextYear]) => {
      if (!active) return;
      setReleased(thisYear);
      setUpcoming(nextYear);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "OMDb movie listings are temporarily unavailable.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [year]);

  return (
    <section className="w-full max-w-7xl mx-auto mb-16 space-y-10" aria-label="New and upcoming movies">
      {error && <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-900/20 p-4 text-amber-100">{error}</p>}
      <ReleaseSection title={`Released this year (${year})`} subtitle="OMDb matches, sorted by IMDb rating">
        {loading ? <Loading /> : released.length ? <MovieGrid movies={released} onMovieClick={onMovieClick} onAddToList={onAddToList} /> : <Empty>No rated OMDb matches found for this year.</Empty>}
      </ReleaseSection>
      <ReleaseSection title="Upcoming movies" subtitle={`OMDb title matches for ${year + 1}`}>
        {loading ? <Loading /> : upcoming.length ? <MovieGrid movies={upcoming} onMovieClick={onMovieClick} onAddToList={onAddToList} /> : <Empty>No OMDb matches found for next year yet.</Empty>}
      </ReleaseSection>
      <p className="text-center text-white/45 text-xs">OMDb requires title searches and does not provide a complete year-by-year release list. Upcoming dates may not be available.</p>
    </section>
  );
}

function ReleaseSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="rounded-3xl border border-white/20 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-9">
    <div className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Movie guide</p><h2 className="text-2xl font-bold text-white md:text-3xl">{title}</h2><p className="mt-2 text-sm text-white/60">{subtitle}</p></div>
    {children}
  </div>;
}

function MovieGrid({ movies, onMovieClick, onAddToList }: Props & { movies: Movie[] }) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {movies.map((movie) => <MovieCard key={movie.imdbID} movie={movie} onMovieClick={onMovieClick} onAddToList={onAddToList} showAddButton />)}
  </div>;
}

function Loading() { return <p className="py-8 text-white/65">Loading OMDb movies…</p>; }
function Empty({ children }: { children: ReactNode }) { return <p className="rounded-xl border border-white/10 bg-black/10 p-5 text-white/65">{children}</p>; }

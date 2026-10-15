"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import MovieCard from "@/app/components/MovieCard";

type CardMovie = ComponentProps<typeof MovieCard>["movie"];

export type DiscoveryMovie = {
  Title: string;
  Year: string;
  imdbID: string;
  tmdbId: number;
  Type: string;
  Poster: string;
  Plot?: string;
  ReleaseDate: string;
  imdbRating?: string;
  ratingLabel?: string;
  [key: string]: string | number | boolean | undefined;
};

type DiscoveryResponse = {
  year: number;
  releasedThisYear: DiscoveryMovie[];
  upcoming: DiscoveryMovie[];
  error?: string;
};

type Props = {
  onMovieClick: (movie: CardMovie) => void;
  onAddToList: (movie: CardMovie) => void;
};

function ReleaseSection({
  title,
  emoji,
  movies,
  loading,
  onMovieClick,
  onAddToList,
}: {
  title: string;
  emoji: string;
  movies: DiscoveryMovie[];
  loading: boolean;
  onMovieClick: Props["onMovieClick"];
  onAddToList: Props["onAddToList"];
}) {
  return (
    <section className="mb-12 w-full max-w-7xl" aria-label={title}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Movie guide</p>
          <h2 className="text-2xl font-bold text-white md:text-3xl">{emoji} {title}</h2>
        </div>
        {!loading && <span className="text-sm text-white/60">{movies.length} titles</span>}
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/70">Loading movies…</p>
      ) : movies.length ? (
        <div className="overflow-x-auto rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="flex min-w-max gap-5 pb-3">
            {movies.map((movie) => (
              <div key={movie.tmdbId} className="w-64 shrink-0">
                <MovieCard movie={movie} onMovieClick={onMovieClick} onAddToList={onAddToList} showAddButton />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/70">No movies found for this section.</p>
      )}
    </section>
  );
}

export default function MovieDiscoverySections({ onMovieClick, onAddToList }: Props) {
  const [data, setData] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/movies/discovery", { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as DiscoveryResponse;
        if (!response.ok) throw new Error(result.error || "Could not load movie releases.");
        setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Could not load movie releases.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="w-full max-w-7xl">
      {error && (
        <p role="status" className="mb-8 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
          Movie releases are temporarily unavailable: {error}
        </p>
      )}
      <ReleaseSection
        title={data ? `Released in ${data.year}` : "Released this year"}
        emoji="🎞️"
        movies={data?.releasedThisYear ?? []}
        loading={loading}
        onMovieClick={onMovieClick}
        onAddToList={onAddToList}
      />
      <ReleaseSection
        title="Upcoming movies"
        emoji="🍿"
        movies={data?.upcoming ?? []}
        loading={loading}
        onMovieClick={onMovieClick}
        onAddToList={onAddToList}
      />
      <section aria-label="Credits" className="mb-10 flex flex-col items-center gap-3 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Credits</h2>
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" aria-label="The Movie Database (TMDB)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg"
            alt="The Movie Database (TMDB)"
            width={72}
            height={72}
            className="h-14 w-14 object-contain"
          />
        </a>
        <p className="max-w-xl text-xs text-white/50">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </section>
    </div>
  );
}

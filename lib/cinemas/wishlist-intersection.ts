import { matchMovieTitle, type MovieCandidate } from "./matching";
import type { Showtime } from "./types";

export type WatchlistTitle = {
  imdbID: string;
  Title: string;
  Year: string;
};

/** Match only using provider IMDb ID or exact title plus release year. */
export function matchScreeningToWatchlist(
  screening: Pick<Showtime, "movieTitle" | "movieImdbId" | "movieReleaseYear">,
  watchlist: WatchlistTitle[],
): { movie: WatchlistTitle; confidence: number } | null {
  if (!screening.movieImdbId && screening.movieReleaseYear === undefined) return null;

  const query: MovieCandidate = {
    title: screening.movieTitle,
    ...(screening.movieImdbId ? { imdbId: screening.movieImdbId } : {}),
    ...(screening.movieReleaseYear !== undefined ? { year: screening.movieReleaseYear } : {}),
  };
  const entries = watchlist.map((movie) => ({
    movie,
    candidate: {
      imdbId: movie.imdbID,
      title: movie.Title,
      year: movie.Year,
    } satisfies MovieCandidate,
  }));
  const result = matchMovieTitle(query, entries.map((entry) => entry.candidate));
  if (result.state !== "matched") return null;
  const entry = entries.find((candidate) => candidate.candidate === result.candidate);
  return entry ? { movie: entry.movie, confidence: result.confidence } : null;
}

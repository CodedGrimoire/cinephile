import { matchMovieTitle, normalizeMovieTitle, type MovieCandidate } from "./matching";
import type { Showtime } from "./types";

export type WatchlistTitle = {
  imdbID: string;
  Title: string;
  Year: string;
  tmdbId?: number;
};

/** Match by a unique stable provider ID where the wishlist has one, otherwise exact title/alias plus year. */
export function matchScreeningToWatchlist(
  screening: Pick<Showtime, "movieTitle" | "movieAlternateTitles" | "movieTmdbId" | "movieImdbId" | "movieReleaseYear">,
  watchlist: WatchlistTitle[],
): { movie: WatchlistTitle; confidence: number } | null {
  if (screening.movieTmdbId !== undefined) {
    const idMatches = watchlist.filter((movie) => movie.tmdbId === screening.movieTmdbId);
    if (idMatches.length === 1) return { movie: idMatches[0], confidence: 1 };
    if (idMatches.length > 1) return null;
  }

  // Star marks theatrical re-releases with a known edition suffix (for example,
  // “Avengers Endgame: Encore”). Only match the exact base title and only when
  // it identifies one wishlist entry. Keep the provider release year out of
  // this one explicit re-release comparison because it denotes the new run.
  const encore = screening.movieTitle.match(/^(.*?)(?:\s*[:–—-]\s*)encore\s*$/i);
  if (encore?.[1]) {
    const base = normalizeMovieTitle(encore[1]);
    const matches = watchlist.filter((movie) => normalizeMovieTitle(movie.Title) === base);
    if (matches.length === 1) return { movie: matches[0], confidence: 0.9 };
    if (matches.length > 1) return null;
  }

  if (!screening.movieImdbId && screening.movieReleaseYear === undefined) return null;

  const query: MovieCandidate = {
    title: screening.movieTitle,
    ...(screening.movieAlternateTitles ? { alternateTitles: screening.movieAlternateTitles } : {}),
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

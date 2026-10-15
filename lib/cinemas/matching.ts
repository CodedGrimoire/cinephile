export type MovieCandidate = {
  imdbId?: string;
  title: string;
  year?: number | string;
  alternateTitles?: string[];
};

export type MovieMatch =
  | { state: "matched"; candidate: MovieCandidate; confidence: number; reason: "exact_title_and_year" | "exact_title" }
  | { state: "ambiguous"; candidates: Array<{ candidate: MovieCandidate; confidence: number }> }
  | { state: "unresolved"; candidates: Array<{ candidate: MovieCandidate; confidence: number }> };

export function normalizeMovieTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function yearNumber(year: number | string | undefined): number | undefined {
  if (year === undefined) return undefined;
  const found = String(year).match(/\b\d{4}\b/);
  return found ? Number(found[0]) : undefined;
}

function titles(movie: MovieCandidate): Set<string> {
  return new Set([movie.title, ...(movie.alternateTitles ?? [])].map(normalizeMovieTitle).filter(Boolean));
}

/** Exact normalized title aliases plus year; close/fuzzy titles are deliberately unresolved. */
export function matchMovieTitle(
  query: MovieCandidate,
  candidates: MovieCandidate[],
): MovieMatch {
  const queryTitles = titles(query);
  const queryYear = yearNumber(query.year);
  const ranked = candidates.map((candidate) => {
    const candidateTitles = titles(candidate);
    const exact = [...queryTitles].some((title) => candidateTitles.has(title));
    const sameYear = queryYear !== undefined && queryYear === yearNumber(candidate.year);
    return { candidate, exact, sameYear, confidence: exact ? (sameYear ? 1 : 0.9) : 0 };
  }).filter(({ exact }) => exact);

  if (ranked.length === 1) {
    const best = ranked[0];
    if (queryYear !== undefined && yearNumber(best.candidate.year) !== undefined && !best.sameYear) {
      return { state: "unresolved", candidates: [{ candidate: best.candidate, confidence: 0.35 }] };
    }
    return {
      state: "matched",
      candidate: best.candidate,
      confidence: best.confidence,
      reason: best.sameYear ? "exact_title_and_year" : "exact_title",
    };
  }

  const rankedCandidates = ranked.map(({ candidate, confidence }) => ({ candidate, confidence }));
  if (ranked.length > 1) {
    if (queryYear !== undefined) {
      const sameYear = ranked.filter((item) => item.sameYear);
      if (sameYear.length === 1) {
        return { state: "matched", candidate: sameYear[0].candidate, confidence: 1, reason: "exact_title_and_year" };
      }
    }
    return { state: "ambiguous", candidates: rankedCandidates };
  }
  return { state: "unresolved", candidates: [] };
}

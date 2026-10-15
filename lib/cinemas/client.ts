import { matchMovieTitle, type MovieCandidate } from "./matching";
import type { CinemaLocation, CinemaMovie, Showtime, SourceMetadata } from "./types";
import { dateInTimezone } from "./calendar";
export { addCalendarDays, dhakaDate, formatDhakaDateTime, formatDhakaTime } from "./calendar";
import type { MovieMatch } from "./matching";

export type ShowtimeListing = {
  state: "screening_scheduled" | "confirmed_no_screenings" | "currently_showing" | "no_matching_screenings";
  screenings: Showtime[];
};

export type CinemaClientResult<T> =
  | { state: "success"; data: T; source: SourceMetadata }
  | { state: "unavailable"; message: string; sourceUrl?: string }
  | { state: "provider_error"; message: string; sourceUrl?: string }
  | { state: "network_error"; message: string }
  | { state: "invalid_response"; message: string };

type Fetcher = typeof fetch;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function sourceOf(value: unknown): value is SourceMetadata {
  const source = record(value);
  return source?.provider === "star-cineplex" && typeof source.sourceUrl === "string" &&
    (source.mode === "official-public-directory" || source.mode === "provider-feed") &&
    (source.fetchedAt === undefined || (typeof source.fetchedAt === "string" && Number.isFinite(Date.parse(source.fetchedAt)))) &&
    (source.checkedAt === undefined || (typeof source.checkedAt === "string" && Number.isFinite(Date.parse(source.checkedAt))));
}

function isLocation(value: unknown): value is CinemaLocation {
  const item = record(value);
  return typeof item?.id === "string" && typeof item.name === "string" && typeof item.branchCode === "string" &&
    typeof item.address === "string" && typeof item.city === "string" && typeof item.officialUrl === "string";
}

function isMovie(value: unknown): value is CinemaMovie {
  const item = record(value);
  return typeof item?.providerMovieId === "string" && typeof item.title === "string" && Array.isArray(item.alternateTitles) &&
    item.alternateTitles.every((title) => typeof title === "string") && Array.isArray(item.formats) &&
    item.formats.every((format) => ["2D", "3D", "IMAX", "ATMOS", "UNKNOWN"].includes(String(format))) &&
    (item.releaseYear === undefined || (typeof item.releaseYear === "number" && Number.isInteger(item.releaseYear))) &&
    (item.tmdbId === undefined || (typeof item.tmdbId === "number" && Number.isInteger(item.tmdbId))) &&
    (item.imdbId === undefined || typeof item.imdbId === "string") &&
    (item.officialUrl === undefined || typeof item.officialUrl === "string");
}

function isShowtime(value: unknown): value is Showtime {
  const item = record(value);
  const price = record(item?.price);
  const validPrice = item?.price === undefined || Boolean(price && typeof price.amount === "number" && Number.isFinite(price.amount) &&
    price.amount >= 0 && price.currency === "BDT");
  const validSeats = item?.seatsRemaining === undefined || (typeof item.seatsRemaining === "number" &&
    Number.isInteger(item.seatsRemaining) && item.seatsRemaining >= 0);
  const priceRange = record(item?.priceRange);
  const validPriceRange = item?.priceRange === undefined || Boolean(priceRange && typeof priceRange.min === "number" &&
    Number.isFinite(priceRange.min) && typeof priceRange.max === "number" && Number.isFinite(priceRange.max) &&
    priceRange.min >= 0 && priceRange.max >= priceRange.min && priceRange.currency === "BDT");
  const validBookingUrl = item?.officialBookingUrl === undefined || (typeof item.officialBookingUrl === "string" &&
    safeBookingUrl(item.officialBookingUrl) === item.officialBookingUrl);
  const validAvailabilityState = item?.availabilityState === undefined ||
    ["availability_unknown", "seats_available", "sold_out"].includes(String(item.availabilityState));
  const startsAt = typeof item?.startsAt === "string" ? new Date(item.startsAt) : null;
  return typeof item?.id === "string" && typeof item.movieId === "string" && typeof item.movieTitle === "string" &&
    (item.movieAlternateTitles === undefined || Array.isArray(item.movieAlternateTitles) && item.movieAlternateTitles.every((title) => typeof title === "string")) &&
    (item.movieTmdbId === undefined || typeof item.movieTmdbId === "number" && Number.isInteger(item.movieTmdbId)) &&
    (item.movieImdbId === undefined || typeof item.movieImdbId === "string" && /^tt\d+$/.test(item.movieImdbId)) &&
    (item.movieReleaseYear === undefined || typeof item.movieReleaseYear === "number" && Number.isInteger(item.movieReleaseYear)) &&
    typeof item.cinemaId === "string" && typeof item.cinemaName === "string" && typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date) && startsAt !== null && Number.isFinite(startsAt.getTime()) &&
    dateInTimezone(startsAt, "Asia/Dhaka") === item.date && typeof item.format === "string" &&
    ["2D", "3D", "IMAX", "ATMOS", "UNKNOWN"].includes(item.format) &&
    ["available", "limited", "sold_out", "unknown"].includes(String(item.availability)) && validPrice && validPriceRange && validSeats && validBookingUrl && validAvailabilityState &&
    (item.salesStatus === undefined || typeof item.salesStatus === "string");
}

async function readResponse<T>(
  response: Response,
  validate: (body: unknown) => { data: T; source: SourceMetadata } | null,
): Promise<CinemaClientResult<T>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { state: "invalid_response", message: "Star Cineplex returned an unreadable response." };
  }
  const payload = record(body);
  if (payload?.state === "unavailable") {
    return {
      state: "unavailable",
      message: typeof payload.message === "string" ? payload.message : "Star Cineplex data is unavailable.",
      sourceUrl: sourceOf(payload.source) ? payload.source.sourceUrl : undefined,
    };
  }
  if (payload?.state === "provider_error") {
    return {
      state: "provider_error",
      message: typeof payload.message === "string" ? payload.message : "Star Cineplex request failed.",
      sourceUrl: sourceOf(payload.source) ? payload.source.sourceUrl : undefined,
    };
  }
  if (!response.ok) return { state: "provider_error", message: "Star Cineplex request failed." };
  const normalized = validate(body);
  if (!normalized || !sourceOf(normalized.source)) {
    return { state: "invalid_response", message: "Star Cineplex returned data in an unexpected format." };
  }
  return { state: "success", data: normalized.data, source: normalized.source };
}

export class CinemaApiClient {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async getLocations(signal?: AbortSignal): Promise<CinemaClientResult<CinemaLocation[]>> {
    return this.request("/api/cinemas", signal, (body) => {
      const payload = record(body);
      return payload?.state === "available" && Array.isArray(payload.data) && payload.data.every(isLocation) && sourceOf(payload.source)
        ? { data: payload.data, source: payload.source }
        : null;
    });
  }

  async getMovies(signal?: AbortSignal): Promise<CinemaClientResult<CinemaMovie[]>> {
    return this.request("/api/cinemas/movies", signal, (body) => {
      const payload = record(body);
      return payload?.state === "available" && Array.isArray(payload.data) && payload.data.every(isMovie) && sourceOf(payload.source)
        ? { data: payload.data, source: payload.source }
        : null;
    });
  }

  async getShowtimes(movie: string, date: string, signal?: AbortSignal): Promise<CinemaClientResult<ShowtimeListing>> {
    const query = new URLSearchParams({ movie, date });
    return this.request(`/api/cinemas/showtimes?${query.toString()}`, signal, this.showtimeListing);
  }

  async getDailyShowtimes(date: string, signal?: AbortSignal, refresh = false): Promise<CinemaClientResult<ShowtimeListing>> {
    const query = new URLSearchParams({ date, ...(refresh ? { refresh: "1" } : {}) });
    return this.request(`/api/cinemas/showtimes?${query.toString()}`, signal, this.showtimeListing);
  }

  private showtimeListing(body: unknown): { data: ShowtimeListing; source: SourceMetadata } | null {
      const payload = record(body);
      if (payload?.state !== "available" || !sourceOf(payload.source)) return null;
      const data = record(payload.data);
      if (!data || !["screening_scheduled", "confirmed_no_screenings", "currently_showing", "no_matching_screenings"].includes(String(data.state)) ||
        !Array.isArray(data.screenings) || !data.screenings.every(isShowtime)) return null;
      return { data: data as ShowtimeListing, source: payload.source };
  }

  matchMovie(movie: { imdbID: string; Title: string; Year: string }, providerMovies: CinemaMovie[]) {
    const query: MovieCandidate = { imdbId: movie.imdbID, title: movie.Title, year: movie.Year };
    const entries = providerMovies.map((candidate) => ({
      movie: candidate,
      query: {
        imdbId: candidate.imdbId,
        title: candidate.title,
        alternateTitles: candidate.alternateTitles,
        year: candidate.releaseYear,
      } satisfies MovieCandidate,
    }));
    const match: MovieMatch = matchMovieTitle(query, entries.map((entry) => entry.query));
    if (match.state !== "matched") return match;
    const matchedMovie = entries.find((entry) => entry.query === match.candidate)?.movie;
    return matchedMovie ? { ...match, candidate: matchedMovie } : { state: "unresolved" as const, candidates: [] };
  }

  private async request<T>(
    path: string,
    signal: AbortSignal | undefined,
    validate: (body: unknown) => { data: T; source: SourceMetadata } | null,
  ): Promise<CinemaClientResult<T>> {
    try {
      const response = await this.fetcher(path, { method: "GET", headers: { Accept: "application/json" }, signal });
      return await readResponse(response, validate);
    } catch {
      if (signal?.aborted) return { state: "network_error", message: "Request cancelled." };
      return { state: "network_error", message: "Could not connect to Star Cineplex. Check your connection and retry." };
    }
  }
}

export function safeBookingUrl(value?: string): string {
  if (!value) return "https://starcineplex.com/showtimes";
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      (url.hostname === "starcineplex.com" || url.hostname.endsWith(".starcineplex.com"))) return url.toString();
  } catch { /* Use the official general schedule page. */ }
  return "https://starcineplex.com/showtimes";
}

export function filterAndSortShowtimes(showtimes: Showtime[], date: string, cinemaId: string): Showtime[] {
  return showtimes
    .filter((showtime) => showtime.date === date && (cinemaId === "all" || showtime.cinemaId === cinemaId))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

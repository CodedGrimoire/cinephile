import { normalizeMovieTitle } from "./matching";
import { dateInTimezone } from "./calendar";
import { fetchProviderJson } from "./request";
import { STAR_CINEPLEX_CAPABILITIES, type CinemaLocation, type CinemaMovie, type ProviderResult, type Showtime, type ShowtimeResult } from "./types";

const API_ROOT = "https://api.kichole.com";
const OFFICIAL_ROOT = "https://starcineplex.com";
const MOVIES_URL = API_ROOT + "/catalog/api/movies";
const VENUES_URL = API_ROOT + "/catalog/api/venues";
const SHOWS_URL = API_ROOT + "/inventory/api/shows";

type Obj = Record<string, unknown>;
type MovieRow = Obj & { id: string; title: { en: string; bn?: string }; slug: string; releaseDate?: string; tmdbId?: number | string | null; formats?: string[] };
type VenueRow = Obj & { id: string; name: { en: string }; slug: string; cityName: string; shortCode?: string; address?: { en?: string } };
type ShowRow = Obj & { id: string; movieId: string; venueId: string; date: string; time: string; format?: string; status?: string; availableSeats?: number; totalSeats?: number; priceRange?: { minPaisa?: number; maxPaisa?: number } };

function obj(value: unknown): Obj | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Obj : null;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isMovie(value: unknown): value is MovieRow {
  const row = obj(value);
  const title = obj(row?.title);
  return typeof row?.id === "string" && typeof title?.en === "string" && Boolean(title.en.trim()) &&
    (title.bn === undefined || typeof title.bn === "string") &&
    typeof row.slug === "string" && (row.releaseDate === undefined || validDate(row.releaseDate)) &&
    (row.tmdbId === undefined || row.tmdbId === null || typeof row.tmdbId === "number" || typeof row.tmdbId === "string") &&
    (row.formats === undefined || Array.isArray(row.formats) && row.formats.every((x) => typeof x === "string"));
}

function isVenue(value: unknown): value is VenueRow {
  const row = obj(value);
  const name = obj(row?.name);
  return typeof row?.id === "string" && typeof name?.en === "string" && Boolean(name.en.trim()) &&
    typeof row.slug === "string" && typeof row.cityName === "string" &&
    (row.shortCode === undefined || typeof row.shortCode === "string");
}

function isShow(value: unknown): value is ShowRow {
  const row = obj(value);
  const price = row?.priceRange === undefined ? null : obj(row.priceRange);
  return typeof row?.id === "string" && typeof row.movieId === "string" && typeof row.venueId === "string" &&
    validDate(row.date) && typeof row.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.time) &&
    (row.format === undefined || typeof row.format === "string") && (row.status === undefined || typeof row.status === "string") &&
    (row.availableSeats === undefined || Number.isInteger(row.availableSeats) && (row.availableSeats as number) >= 0) &&
    (row.totalSeats === undefined || Number.isInteger(row.totalSeats) && (row.totalSeats as number) >= 0) &&
    (row.priceRange === undefined || Boolean(price && typeof price.minPaisa === "number" && Number.isFinite(price.minPaisa) &&
      typeof price.maxPaisa === "number" && Number.isFinite(price.maxPaisa) && price.minPaisa >= 0 && price.maxPaisa >= price.minPaisa));
}

function rows<T>(value: unknown, check: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value) || !value.every(check)) throw new Error("Invalid Star Cineplex response.");
  return value;
}

function formatOf(value: string | undefined): Showtime["format"] {
  const normalized = value?.trim().toUpperCase();
  return normalized === "2D" || normalized === "3D" || normalized === "IMAX" || normalized === "ATMOS" ? normalized : "UNKNOWN";
}

function yearOf(date: string | undefined): number | undefined {
  return date && validDate(date) ? Number(date.slice(0, 4)) : undefined;
}

function branchCode(venue: VenueRow): string {
  return venue.shortCode?.trim() || venue.id;
}

function toMovie(row: MovieRow): CinemaMovie {
  const releaseYear = yearOf(row.releaseDate);
  const alternateTitle = row.title.bn?.trim();
  const hasAlternateTitle = alternateTitle && normalizeMovieTitle(alternateTitle) !== normalizeMovieTitle(row.title.en);
  return {
    providerMovieId: row.id,
    title: row.title.en.trim(),
    alternateTitles: hasAlternateTitle ? [alternateTitle] : [],
    ...(releaseYear ? { releaseYear } : {}),
    ...(typeof row.tmdbId === "number" && Number.isInteger(row.tmdbId) ? { tmdbId: row.tmdbId } : {}),
    formats: [...new Set((row.formats ?? []).map(formatOf))],
    officialUrl: OFFICIAL_ROOT + "/movies/" + encodeURIComponent(row.slug),
  };
}

function toLocation(row: VenueRow): CinemaLocation {
  const code = branchCode(row);
  return {
    id: code,
    branchCode: code,
    name: row.name.en.trim(),
    address: typeof row.address?.en === "string" ? row.address.en : "",
    city: row.cityName,
    officialUrl: OFFICIAL_ROOT + "/branches/" + encodeURIComponent(row.slug),
  };
}

function toShowtime(show: ShowRow, movie: MovieRow, venue: VenueRow): Showtime {
  const [hour, minute] = show.time.split(":").map(Number);
  // The source gives a calendar date and local wall-clock time separately.
  const startsAt = new Date(Date.UTC(Number(show.date.slice(0, 4)), Number(show.date.slice(5, 7)) - 1, Number(show.date.slice(8, 10)), hour - 6, minute));
  const status = show.status?.trim();
  const seats = show.availableSeats;
  const soldOut = seats === 0 || status?.toLowerCase() === "sold out" || status?.toLowerCase() === "soldout";
  const availability = soldOut ? "sold_out" : status?.toLowerCase() === "selling" && typeof seats === "number" ? "available" : "unknown";
  const min = show.priceRange?.minPaisa;
  const max = show.priceRange?.maxPaisa;
  const hasPrice = typeof min === "number" && typeof max === "number";
  const releaseYear = yearOf(movie.releaseDate);
  return {
    id: show.id,
    movieId: movie.id,
    movieTitle: movie.title.en.trim(),
    ...(movie.title.bn?.trim() && normalizeMovieTitle(movie.title.bn) !== normalizeMovieTitle(movie.title.en) ? { movieAlternateTitles: [movie.title.bn.trim()] } : {}),
    ...(typeof movie.tmdbId === "number" && Number.isInteger(movie.tmdbId) ? { movieTmdbId: movie.tmdbId } : {}),
    ...(releaseYear ? { movieReleaseYear: releaseYear } : {}),
    cinemaId: branchCode(venue),
    cinemaName: venue.name.en.trim(),
    date: show.date,
    startsAt: startsAt.toISOString(),
    format: formatOf(show.format),
    availability,
    availabilityState: soldOut ? "sold_out" : availability === "unknown" ? "availability_unknown" : "seats_available",
    ...(hasPrice ? {
      price: { amount: min / 100, currency: "BDT" as const },
      priceRange: { min: min / 100, max: max / 100, currency: "BDT" as const },
    } : {}),
    ...(typeof seats === "number" ? { seatsRemaining: seats } : {}),
    ...(status ? { salesStatus: status } : {}),
    officialBookingUrl: OFFICIAL_ROOT + "/showtimes",
  };
}

type JsonReader = typeof fetchProviderJson;

async function readFeed(readJson: JsonReader) {
  const [moviesBody, venuesBody, showsBody] = await Promise.all([
    readJson(MOVIES_URL),
    readJson(VENUES_URL),
    readJson(SHOWS_URL),
  ]);
  const movies = rows(moviesBody, isMovie);
  const venues = rows(venuesBody, isVenue);
  const shows = rows(showsBody, isShow);
  const movieById = new Map(movies.map((item) => [item.id, item]));
  const venueById = new Map(venues.map((item) => [item.id, item]));
  const screenings = shows.map((show) => {
    const movie = movieById.get(show.movieId);
    const venue = venueById.get(show.venueId);
    if (!movie || !venue) throw new Error("Unknown movie or venue reference.");
    return toShowtime(show, movie, venue);
  });
  return { movies: movies.map(toMovie), locations: venues.map(toLocation), screenings, retrievedAt: new Date().toISOString() };
}

function source(sourceUrl: string, retrievedAt: string) {
  return { provider: "star-cineplex" as const, sourceUrl, fetchedAt: retrievedAt, mode: "provider-feed" as const };
}

function available<T>(capability: string, data: T, sourceUrl: string, retrievedAt: string): ProviderResult<T> {
  return { state: "available", availabilityState: "data_available", capability, capabilities: { ...STAR_CINEPLEX_CAPABILITIES }, freshness: "current", matchConfidence: "not_applicable", retrievedAt, data, source: source(sourceUrl, retrievedAt) };
}

function unavailable(capability: string, sourceUrl: string): ProviderResult<never> {
  return {
    state: "provider_error",
    availabilityState: "provider_unavailable",
    capability,
    capabilities: { ...STAR_CINEPLEX_CAPABILITIES },
    freshness: "not_retrieved",
    matchConfidence: "not_applicable",
    message: "Star Cineplex data could not be retrieved or validated.",
    source: { provider: "star-cineplex", sourceUrl, checkedAt: new Date().toISOString(), mode: "provider-feed" },
  };
}

export class StarCineplexProvider {
  constructor(private readonly readJson: JsonReader = fetchProviderJson) {}

  async getLocations(): Promise<ProviderResult<CinemaLocation[]>> {
    try {
      const payload = await this.readJson(VENUES_URL);
      const locations = rows(payload, isVenue).map(toLocation);
      return available("branches", locations, VENUES_URL, new Date().toISOString());
    }
    catch { return unavailable("branches", VENUES_URL); }
  }

  async getMovies(): Promise<ProviderResult<CinemaMovie[]>> {
    try {
      const payload = await this.readJson(MOVIES_URL);
      const movies = rows(payload, isMovie).map(toMovie);
      return available("catalogue", movies, MOVIES_URL, new Date().toISOString());
    }
    catch { return unavailable("catalogue", MOVIES_URL); }
  }

  async getShowtimes(movie: string, date: string): Promise<ShowtimeResult> {
    const result = await this.getDailySchedule(date);
    if (result.state !== "available") return result;
    const title = normalizeMovieTitle(movie);
    const screenings = result.data.screenings.filter((screening) => normalizeMovieTitle(screening.movieTitle) === title);
    return { ...result, capability: "showtimes", data: { state: screenings.length ? "screening_scheduled" : "confirmed_no_screenings", screenings } };
  }

  async getDailySchedule(date: string): Promise<ShowtimeResult> {
    try {
      const feed = await readFeed(this.readJson);
      const publishedDates = [...new Set(feed.screenings.map((screening) => screening.date))].sort();
      if (!publishedDates.includes(date)) {
        return {
          state: "unavailable",
          availabilityState: "data_unavailable",
          capability: "showtimes",
          capabilities: { ...STAR_CINEPLEX_CAPABILITIES },
          freshness: "not_retrieved",
          matchConfidence: "not_applicable",
          message: publishedDates.length ? "Star Cineplex has not published a schedule for " + date + ". Current dates: " + publishedDates.join(", ") + "." : "Star Cineplex has not published dated screenings.",
          source: source(SHOWS_URL, feed.retrievedAt),
        };
      }
      const now = new Date();
      const todayInDhaka = dateInTimezone(now, "Asia/Dhaka");
      const screenings = feed.screenings
        .filter((screening) => screening.date === date && (date !== todayInDhaka || Date.parse(screening.startsAt) > now.getTime()))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.cinemaName.localeCompare(b.cinemaName));
      return available("showtimes", { state: screenings.length ? "screening_scheduled" : "confirmed_no_screenings", screenings }, SHOWS_URL, feed.retrievedAt);
    } catch {
      return unavailable("showtimes", SHOWS_URL);
    }
  }
}

export const starCineplexProvider = new StarCineplexProvider();

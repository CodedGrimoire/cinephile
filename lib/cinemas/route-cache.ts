import { BoundedAsyncCache } from "./cache";
import type { CinemaMovie, ProviderResult, ShowtimeResult } from "./types";

export const movieListCache = new BoundedAsyncCache<ProviderResult<CinemaMovie[]>>();
export const showtimeCache = new BoundedAsyncCache<ShowtimeResult>();

export function cacheable<T>(result: ProviderResult<T>): boolean {
  return result.state === "available";
}

export function cacheableShowtimeSchedule(result: ShowtimeResult): boolean {
  if (result.state !== "available") return false;
  return result.data.screenings.every((screening) =>
    screening.availability === "unknown" &&
    screening.availabilityState === "availability_unknown" &&
    screening.seatsRemaining === undefined,
  );
}

export function withStaleMetadata<T>(result: ProviderResult<T>, stale: boolean): ProviderResult<T> {
  if (!stale) return result;
  return result.state === "available"
    ? { ...result, freshness: "stale", source: { ...result.source, stale: true } }
    : result;
}

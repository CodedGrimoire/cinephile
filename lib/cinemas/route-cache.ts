import { BoundedAsyncCache } from "./cache";
import type { CinemaMovie, ProviderResult, ShowtimeResult } from "./types";

export const movieListCache = new BoundedAsyncCache<ProviderResult<CinemaMovie[]>>();
// Seat counts are snapshots, so keep them briefly and never serve stale entries.
export const liveScheduleCache = new BoundedAsyncCache<ShowtimeResult>(60_000, 0, 100);

export function cacheable<T>(result: ProviderResult<T>): boolean {
  return result.state === "available";
}

export function withStaleMetadata<T>(result: ProviderResult<T>, stale: boolean): ProviderResult<T> {
  if (!stale) return result;
  return result.state === "available"
    ? { ...result, freshness: "stale", source: { ...result.source, stale: true } }
    : result;
}

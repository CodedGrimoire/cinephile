import { BoundedAsyncCache } from "./cache";
import type { CinemaMovie, ProviderResult, ShowtimeResult } from "./types";

export const movieListCache = new BoundedAsyncCache<ProviderResult<CinemaMovie[]>>();
export const showtimeCache = new BoundedAsyncCache<ShowtimeResult>();

export function cacheable<T>(result: ProviderResult<T>): boolean {
  return result.state === "available";
}

export function withStaleMetadata<T>(result: ProviderResult<T>, stale: boolean): ProviderResult<T> {
  if (!stale) return result;
  return { ...result, source: { ...result.source, stale: true } };
}

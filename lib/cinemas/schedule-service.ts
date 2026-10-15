import { cacheable, liveScheduleCache, withStaleMetadata } from "./route-cache";
import { starCineplexProvider } from "./star-cineplex";
import type { ShowtimeResult } from "./types";

export async function getCachedDailySchedule(date: string, movie?: string, forceRefresh = false): Promise<ShowtimeResult> {
  const cacheKey = movie
    ? `star-cineplex:showtimes:${movie.toLocaleLowerCase("en")}:${date}`
    : `star-cineplex:showtimes:all:${date}`;
  const loader = () => movie
    ? starCineplexProvider.getShowtimes(movie, date)
    : starCineplexProvider.getDailySchedule(date);

  if (forceRefresh) liveScheduleCache.delete(cacheKey);
  const cached = await liveScheduleCache.get(cacheKey, loader, cacheable);
  return withStaleMetadata(cached.value, cached.stale);
}

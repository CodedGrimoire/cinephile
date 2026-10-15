"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CinemaApiClient,
  formatDhakaDateTime,
  formatDhakaTime,
  safeBookingUrl,
  type CinemaClientResult,
  type ShowtimeListing,
} from "@/lib/cinemas/client";
import { dhakaDate } from "@/lib/cinemas/calendar";
import { matchScreeningToWatchlist, type WatchlistTitle } from "@/lib/cinemas/wishlist-intersection";
import type { Showtime } from "@/lib/cinemas/types";

const apiClient = new CinemaApiClient();
const OFFICIAL_SCHEDULE_URL = "https://starcineplex.com/showtimes";

function availabilityLabel(showtime: Showtime): string {
  if (showtime.availabilityState === "availability_unknown" || (!showtime.availabilityState && showtime.availability === "unknown")) {
    return "Seat availability unknown";
  }
  if (showtime.availabilityState === "sold_out" || showtime.availability === "sold_out") return "Sold out";
  if (showtime.availability === "limited") return "Limited availability reported";
  if (showtime.availability === "available") return "Seats reported available";
  return "Seat availability unknown";
}

export default function CineplexAvailability({
  watchlist,
  initialDate,
  initialSchedule,
}: {
  watchlist: WatchlistTitle[];
  initialDate: string;
  initialSchedule: CinemaClientResult<ShowtimeListing>;
}) {
  const [date, setDate] = useState(initialDate);
  const [result, setResult] = useState<CinemaClientResult<ShowtimeListing> | null>(initialSchedule);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const initialFetchedAt = initialSchedule.state === "success" ? initialSchedule.source.fetchedAt : undefined;
    if (date === initialDate && initialFetchedAt && Date.now() - Date.parse(initialFetchedAt) < 60_000) return;

    const controller = new AbortController();
    requestControllerRef.current = controller;
    setResult(null);
    if (watchlist.length === 0) return () => controller.abort();
    void apiClient.getDailyShowtimes(date, controller.signal).then((response) => {
      if (!controller.signal.aborted) setResult(response);
    });
    return () => {
      controller.abort();
      requestControllerRef.current?.abort();
    };
  }, [date, initialDate, initialSchedule, watchlist.length]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  const refreshShowtimes = () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setResult(null);
    void apiClient.getDailyShowtimes(date, controller.signal, true).then((response) => {
      if (!controller.signal.aborted) setResult(response);
    });
  };

  const grouped = useMemo(() => {
    if (result?.state !== "success") return [];
    const groups = new Map<string, { title: string; screenings: Showtime[] }>();
    for (const showtime of result.data.screenings) {
      const match = matchScreeningToWatchlist(showtime, watchlist);
      if (!match) continue;
      const key = match.movie.imdbID;
      const group = groups.get(key) ?? { title: match.movie.Title, screenings: [] };
      group.screenings.push(showtime);
      groups.set(key, group);
    }
    return [...groups.values()];
  }, [result, watchlist]);

  return (
    <section className="mb-12 rounded-2xl border border-cyan-200/20 bg-black/45 p-5 text-white shadow-xl backdrop-blur-lg sm:p-7" aria-labelledby="cineplex-availability-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/75">Star Cineplex</p>
          <h2 id="cineplex-availability-title" className="mt-1 text-2xl font-bold sm:text-3xl">Your Watchlist at Star Cineplex</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">Only watchlist movies with a confidently matched screening for the selected Bangladesh date appear here. Seat counts and prices are provider-reported snapshots and can change; they do not reserve seats.</p>
        </div>
        <label className="text-sm text-white/75">
          Date <span className="text-xs text-white/45">(Bangladesh time)</span>
          <input
            type="date"
            min={dhakaDate()}
            value={date}
            onChange={(event) => { if (event.target.value) setDate(event.target.value); }}
            className="mt-1 block w-full rounded-lg border border-white/15 bg-[#171a25] px-3 py-2 text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cyan-300"
          />
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-5" aria-live="polite">
        {watchlist.length === 0 && <p className="py-3 text-white/70">Add movies to your watchlist to see which ones have Star Cineplex screenings.</p>}
        {watchlist.length > 0 && !result && <p role="status" className="py-3 text-white/70">Checking your watchlist against the Star Cineplex schedule…</p>}
        {result?.state === "success" && result.data.screenings.length === 0 && (
          <p className="py-3 text-white/70">No screenings were listed for this date.</p>
        )}
        {result?.state === "success" && result.data.screenings.length > 0 && grouped.length === 0 && (
          <p className="py-3 text-white/70">No movie from your watchlist could be confidently matched to a screening on this date.</p>
        )}
        {result?.state === "success" && result.data.screenings.length > 0 && (
          <>
            {result.source.fetchedAt && <p className="mb-4 text-xs text-white/45">Schedule updated {formatDhakaDateTime(result.source.fetchedAt)} (Bangladesh time).</p>}
            {result.source.stale && <p className="mb-4 text-xs text-amber-100/80">Showing cached schedule data because the latest refresh failed.</p>}
            <div className="grid gap-4 md:grid-cols-2">
              {grouped.map(({ title, screenings }, index) => (
                <article key={`${title}-${index}`} className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <ul className="mt-3 space-y-2">
                    {screenings.map((showtime) => (
                      <li key={`${showtime.cinemaId}-${showtime.id}`} className="rounded-lg border border-white/10 p-3">
                        <p className="font-medium">{showtime.cinemaName}</p>
                        <p className="mt-1 text-sm text-white/70">
                          {formatDhakaTime(showtime.startsAt)}
                          {showtime.format !== "UNKNOWN" && ` · ${showtime.format}`}
                        </p>
                        <p className="mt-1 text-xs text-white/50">
                          {availabilityLabel(showtime)}
                          {typeof showtime.seatsRemaining === "number" && ` · ${showtime.seatsRemaining} seats reported`}
                          {showtime.priceRange
                            ? ` · BDT ${showtime.priceRange.min}${showtime.priceRange.max !== showtime.priceRange.min ? `–${showtime.priceRange.max}` : ""}`
                            : showtime.price && ` · BDT ${showtime.price.amount}`}
                          {showtime.salesStatus && ` · ${showtime.salesStatus}`}
                        </p>
                        <a href={safeBookingUrl(showtime.officialBookingUrl)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-cyan-100 underline underline-offset-4">
                          Official booking
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </>
        )}
        {result && result.state !== "success" && (
          <div>
            <p className="font-medium text-amber-100">
              {result.state === "network_error"
                ? "Cinephile couldn’t load its showtimes right now."
                : result.state === "invalid_response"
                  ? "Cinephile couldn’t read the showtime response."
                  : "Live Star Cineplex showtimes aren’t available right now."}
            </p>
            <p className="mt-1 text-sm text-white/55">{result.message}</p>
            <a href={OFFICIAL_SCHEDULE_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-cyan-100 underline underline-offset-4">
              View the official Star Cineplex schedule
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <a href={OFFICIAL_SCHEDULE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-100 underline decoration-cyan-100/40 underline-offset-4">
          Official Star Cineplex schedule
        </a>
        <button type="button" disabled={!result} onClick={refreshShowtimes} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-50">
          {result?.state === "network_error" || result?.state === "invalid_response" ? "Retry showtimes" : "Refresh showtimes"}
        </button>
      </div>
    </section>
  );
}

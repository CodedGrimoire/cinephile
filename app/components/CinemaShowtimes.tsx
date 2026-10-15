"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CinemaApiClient,
  filterAndSortShowtimes,
  formatDhakaDateTime,
  formatDhakaTime,
  safeBookingUrl,
  type CinemaClientResult,
} from "@/lib/cinemas/client";
import { dhakaDate } from "@/lib/cinemas/calendar";
import type { CinemaLocation, CinemaMovie, Showtime } from "@/lib/cinemas/types";

type Movie = { imdbId: string; title: string; year: string };
type ScheduleState =
  | { state: "idle" | "loading" }
  | { state: "ready"; screenings: Showtime[]; noMatches: boolean; fetchedAt?: string; stale?: boolean }
  | { state: "unavailable"; message: string }
  | { state: "network_error"; message: string }
  | { state: "provider_error"; message: string }
  | { state: "invalid_response"; message: string }
  | { state: "no_matching_movie" };

const apiClient = new CinemaApiClient();
const OFFICIAL_SCHEDULE_URL = "https://starcineplex.com/showtimes";

function matchProviderMovie(
  client: CinemaApiClient,
  movie: Movie,
  result: CinemaClientResult<CinemaMovie[]>,
) {
  if (result.state !== "success") return result;
  return client.matchMovie({ imdbID: movie.imdbId, Title: movie.title, Year: movie.year }, result.data);
}

function stateForFailure(result: Exclude<CinemaClientResult<unknown>, { state: "success" }>): ScheduleState {
  if (result.state === "unavailable") return { state: "unavailable", message: result.message };
  if (result.state === "network_error") return { state: "network_error", message: result.message };
  if (result.state === "provider_error") return { state: "provider_error", message: result.message };
  return { state: "invalid_response", message: result.message };
}

function availabilityLabel(status: Showtime["availability"]): string {
  if (status === "available") return "Availability reported";
  if (status === "limited") return "Limited availability";
  if (status === "sold_out") return "Sold out";
  return "Seat availability unknown";
}

export default function CinemaShowtimes({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const titleId = `cinema-title-${movie.imdbId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [locationsResult, setLocationsResult] = useState<CinemaClientResult<CinemaLocation[]> | null>(null);
  const [moviesResult, setMoviesResult] = useState<CinemaClientResult<CinemaMovie[]> | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState>({ state: "loading" });
  const [selectedCinema, setSelectedCinema] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => dhakaDate());
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    setLocationsResult(null);
    setMoviesResult(null);
    setSchedule({ state: "loading" });
    setSelectedCinema("all");
    void apiClient.getLocations(controller.signal).then((result) => {
      if (!controller.signal.aborted) setLocationsResult(result);
    });
    void apiClient.getMovies(controller.signal).then((result) => {
      if (!controller.signal.aborted) setMoviesResult(result);
    });
    return () => controller.abort();
  }, [movie.imdbId, movie.title, movie.year, reloadVersion]);

  const movieMatch = useMemo(
    () => moviesResult ? matchProviderMovie(apiClient, movie, moviesResult) : null,
    [movie, moviesResult],
  );

  useEffect(() => {
    if (!moviesResult) return;
    if (moviesResult.state !== "success") {
      setSchedule(stateForFailure(moviesResult));
      return;
    }
    if (!movieMatch || movieMatch.state !== "matched") {
      setSchedule({ state: "no_matching_movie" });
      return;
    }

    const controller = new AbortController();
    setSchedule({ state: "loading" });
    void apiClient.getShowtimes(movieMatch.candidate.title, selectedDate, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.state !== "success") {
        setSchedule(stateForFailure(result));
      } else {
        setSchedule({
          state: "ready",
          screenings: result.data.screenings,
          noMatches: result.data.state === "no_matching_screenings",
          fetchedAt: result.source.fetchedAt,
          stale: result.source.stale,
        });
      }
    });
    return () => controller.abort();
  }, [moviesResult, movieMatch, selectedDate, reloadVersion]);

  const locations = locationsResult?.state === "success" ? locationsResult.data : [];
  const shownScreenings = useMemo(
    () => filterAndSortShowtimes(schedule.state === "ready" ? schedule.screenings : [], selectedDate, selectedCinema),
    [schedule, selectedDate, selectedCinema],
  );
  const groupedScreenings = useMemo(() => {
    const groups = new Map<string, Showtime[]>();
    for (const screening of shownScreenings) {
      const existing = groups.get(screening.cinemaId) ?? [];
      existing.push(screening);
      groups.set(screening.cinemaId, existing);
    }
    return [...groups.entries()];
  }, [shownScreenings]);

  const retry = () => {
    setMoviesResult(null);
    setLocationsResult(null);
    setSchedule({ state: "loading" });
    setReloadVersion((version) => version + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-3 py-4 backdrop-blur-sm sm:px-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#10121dcc] p-4 text-white shadow-2xl backdrop-blur-xl sm:p-7"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Star Cineplex</p>
            <h2 id={titleId} className="mt-1 text-2xl font-bold sm:text-3xl">Cinema Showtimes</h2>
            <p className="mt-1 text-sm text-white/65">{movie.title} ({movie.year})</p>
            <p className="mt-1 text-xs text-white/45">IMDb {movie.imdbId}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            aria-label="Close cinema showtimes"
          >
            Close
          </button>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-white/75">
            Cinema branch <span className="text-xs text-white/45">(directory snapshot)</span>
            <select
              value={selectedCinema}
              onChange={(event) => setSelectedCinema(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/15 bg-[#171a25] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
              <option value="all">All branches</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-white/75">
            Screening date <span className="text-xs text-white/45">(Bangladesh time)</span>
            <input
              type="date"
              min={dhakaDate()}
              value={selectedDate}
              onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value); }}
              className="mt-1 block w-full rounded-lg border border-white/15 bg-[#171a25] px-3 py-2 text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-5" aria-live="polite">
          {schedule.state === "loading" && (
            <div role="status" className="flex items-center gap-3 py-4 text-white/75">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-cyan-200" aria-hidden="true" />
              Loading Star Cineplex schedule…
            </div>
          )}
          {schedule.state === "unavailable" && (
            <div>
              <p className="font-semibold text-amber-100">Star Cineplex showtimes are currently unavailable. Check the official website for the latest schedule.</p>
              <p className="mt-2 text-sm text-white/55">{schedule.message}</p>
            </div>
          )}
          {schedule.state === "network_error" && <p className="text-rose-100">{schedule.message}</p>}
          {schedule.state === "provider_error" && <p className="text-rose-100">{schedule.message}</p>}
          {schedule.state === "invalid_response" && <p className="text-rose-100">{schedule.message}</p>}
          {schedule.state === "no_matching_movie" && (
            <p className="text-white/75">This title could not be safely matched to the Star Cineplex movie catalogue.</p>
          )}
          {schedule.state === "ready" && schedule.noMatches && (
            <p className="text-white/75">No scheduled showtimes were returned for this date.</p>
          )}
          {schedule.state === "ready" && !schedule.noMatches && groupedScreenings.length === 0 && (
            <p className="text-white/75">The retrieved schedule has no screenings for this branch and date.</p>
          )}
          {schedule.state === "ready" && schedule.fetchedAt && (
            <p className="mb-4 text-xs text-white/45">Schedule data last updated {formatDhakaDateTime(schedule.fetchedAt)} (Bangladesh time).</p>
          )}
          {schedule.state === "ready" && schedule.stale && (
            <p className="mb-4 text-xs text-amber-100/80">Showing cached schedule data because the latest refresh failed.</p>
          )}
          {schedule.state === "ready" && groupedScreenings.map(([cinemaId, screenings]) => {
            const cinemaName = locations.find((location) => location.id === cinemaId)?.name ?? screenings[0].cinemaName;
            return (
              <section key={cinemaId} className="mb-4 last:mb-0" aria-labelledby={`branch-${cinemaId}`}>
                <h3 id={`branch-${cinemaId}`} className="mb-2 text-lg font-semibold">{cinemaName}</h3>
                <ul className="space-y-2">
                  {screenings.map((screening) => (
                    <li key={screening.id} className="flex flex-col justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-semibold">{formatDhakaTime(screening.startsAt)}
                          {screening.format !== "UNKNOWN" && <span className="ml-2 rounded-full bg-cyan-300/10 px-2 py-0.5 text-xs text-cyan-100">{screening.format}</span>}
                        </p>
                        <p className="mt-1 text-xs text-white/55">{availabilityLabel(screening.availability)}
                          {typeof screening.seatsRemaining === "number" && ` · ${screening.seatsRemaining} seats reported`}
                          {screening.price && ` · BDT ${screening.price.amount}`}
                        </p>
                      </div>
                      <a
                        href={safeBookingUrl(screening.officialBookingUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex justify-center rounded-lg border border-cyan-200/30 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                      >
                        {screening.officialBookingUrl ? "Book Tickets" : "Official Booking Website"}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {locationsResult?.state === "success" && locationsResult.source.fetchedAt && (
            <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/40">
              Branch directory snapshot recorded {formatDhakaDateTime(locationsResult.source.fetchedAt)}; it does not confirm live programming.
            </p>
          )}
          {locationsResult && locationsResult.state !== "success" && (
            <p className="mt-4 text-xs text-white/45">Branch directory snapshot is currently unavailable.</p>
          )}
        </div>

        <footer className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={OFFICIAL_SCHEDULE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-100 underline decoration-cyan-100/40 underline-offset-4 hover:decoration-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            Official Booking Website
          </a>
          <button
            type="button"
            onClick={retry}
            disabled={schedule.state === "loading"}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-wait disabled:opacity-50"
          >
            Retry schedule
          </button>
        </footer>
      </section>
    </div>
  );
}

import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAsyncCache } from "../lib/cinemas/cache";
import { cacheableShowtimeSchedule } from "../lib/cinemas/route-cache";
import { matchMovieTitle } from "../lib/cinemas/matching";
import { matchScreeningToWatchlist } from "../lib/cinemas/wishlist-intersection";
import { normalizeShowtimes, safeProviderError } from "../lib/cinemas/normalize";
import { validateScheduleDate, validateShowtimeQuery } from "../lib/cinemas/query-validation";
import { fetchProviderJson, safeProviderRequestError } from "../lib/cinemas/request";
import { StarCineplexProvider } from "../lib/cinemas/star-cineplex";
import {
  CinemaApiClient,
  addCalendarDays,
  dhakaDate,
  filterAndSortShowtimes,
  safeBookingUrl,
} from "../lib/cinemas/client";

const context = {
  movieId: "fixture-movie-1",
  movieTitle: "Sample Film",
  cinemaId: "BSC",
  cinemaName: "Example branch",
  date: "2026-10-16",
};

test("normalizes a clearly synthetic canonical sample fixture", () => {
  // Synthetic fixture only; it is not a captured Star Cineplex response.
  const parsed = normalizeShowtimes({ showtimes: [{
    id: "fixture-show-1",
    startsAt: "2026-10-16T15:30:00+06:00",
    format: "2D",
    availability: "available",
    price: { amount: 550, currency: "BDT" },
    seatsRemaining: 18,
    bookingUrl: "https://starcineplex.com/showtimes",
  }] }, context);

  assert.equal(parsed.state, "screening_scheduled");
  assert.equal(parsed.screenings[0].availabilityState, "seats_available");
  assert.equal(parsed.screenings[0].startsAt, "2026-10-16T09:30:00.000Z");
  assert.equal(parsed.screenings[0].price?.amount, 550);
  assert.equal(parsed.screenings[0].seatsRemaining, 18);
});

test("watchlist intersection matches a verified provider IMDb ID", () => {
  const result = matchScreeningToWatchlist({
    movieTitle: "Different provider title spelling",
    movieImdbId: "tt1234567",
  }, [{ imdbID: "tt1234567", Title: "Watchlist Film", Year: "2024" }]);
  assert.equal(result?.movie.Title, "Watchlist Film");
});

test("watchlist intersection requires exact title and release year when IMDb ID is absent", () => {
  const watchlist = [{ imdbID: "tt1234567", Title: "Dune", Year: "2021" }];
  assert.equal(matchScreeningToWatchlist({ movieTitle: "Dune", movieReleaseYear: 2021 }, watchlist)?.movie.imdbID, "tt1234567");
  assert.equal(matchScreeningToWatchlist({ movieTitle: "Dune" }, watchlist), null);
  assert.equal(matchScreeningToWatchlist({ movieTitle: "Dune", movieReleaseYear: 1984 }, watchlist), null);
});

test("watchlist intersection excludes ambiguous title and year matches", () => {
  const result = matchScreeningToWatchlist({ movieTitle: "Dune", movieReleaseYear: 2021 }, [
    { imdbID: "tt1234567", Title: "Dune", Year: "2021" },
    { imdbID: "tt7654321", Title: "Dune", Year: "2021" },
  ]);
  assert.equal(result, null);
});

test("empty schedules mean no match, while malformed payloads are provider errors", () => {
  assert.deepEqual(normalizeShowtimes({ showtimes: [] }, context), { state: "confirmed_no_screenings", screenings: [] });
  assert.throws(() => normalizeShowtimes({ unexpected: true }, context));
  assert.deepEqual(safeProviderError(), { state: "provider_error", message: "Star Cineplex schedule request failed." });
});

test("normalizer rejects screenings without timestamps or associated with another calendar date", () => {
  assert.throws(() => normalizeShowtimes({ showtimes: [{ id: "missing-date" }] }, context));
  assert.throws(() => normalizeShowtimes({ showtimes: [
    { id: "same-clock-next-day", startsAt: "2026-10-17T13:00:00+06:00" },
  ] }, context));
});

test("unknown availability is not sold out; sold out requires an explicit provider status", () => {
  const parsed = normalizeShowtimes({ showtimes: [
    { id: "unknown", startsAt: "2026-10-16T12:00:00Z" },
    { id: "sold", startsAt: "2026-10-16T13:00:00Z", availability: "sold_out", seatsRemaining: 0 },
  ] }, context);
  assert.equal(parsed.screenings[0].availability, "unknown");
  assert.equal(parsed.screenings[0].availabilityState, "availability_unknown");
  assert.equal(parsed.screenings[1].availability, "sold_out");
  assert.equal(parsed.screenings[1].availabilityState, "sold_out");
});

test("schedule cache excludes dynamic seat counts and availability", () => {
  const unknown = normalizeShowtimes({ showtimes: [{ id: "unknown", startsAt: "2026-10-16T12:00:00Z" }] }, context).screenings;
  const withSeatData = normalizeShowtimes({ showtimes: [{
    id: "available", startsAt: "2026-10-16T12:00:00Z", availability: "available", seatsRemaining: 12,
  }] }, context).screenings;
  const base = {
    state: "available" as const,
    availabilityState: "data_available" as const,
    capability: "showtimes",
    capabilities: { branches: "available" as const, catalogue: "provider_unavailable" as const, showtimes: "available" as const, prices: "data_unavailable" as const, seats: "provider_unavailable" as const },
    freshness: "current" as const,
    matchConfidence: "not_applicable" as const,
    source: { provider: "star-cineplex" as const, sourceUrl: "https://starcineplex.com/showtimes", mode: "provider-feed" as const },
  };
  assert.equal(cacheableShowtimeSchedule({ ...base, data: { state: "screening_scheduled", screenings: unknown } }), true);
  assert.equal(cacheableShowtimeSchedule({ ...base, data: { state: "screening_scheduled", screenings: withSeatData } }), false);
});

test("movie matching handles punctuation/year and reports title collisions as ambiguous", () => {
  const one = { title: "Spider-Man: Homecoming", year: 2017, imdbId: "tt2250912" };
  const match = matchMovieTitle({ title: "SPIDER MAN—HOMECOMING", year: "2017" }, [one]);
  assert.equal(match.state, "matched");
  const ambiguous = matchMovieTitle({ title: "The Gift" }, [
    { title: "The Gift", year: 2000 },
    { title: "The Gift", year: 2015 },
  ]);
  assert.equal(ambiguous.state, "ambiguous");
  assert.equal(matchMovieTitle({ title: "The Gift", year: 2015 }, [{ title: "The Gift" }]).state, "unresolved");
});

test("query validation bounds movie text and requires a real ISO calendar date", () => {
  assert.equal(validateShowtimeQuery("A", "2026-10-16").valid, false);
  assert.equal(validateShowtimeQuery("Film", "2026-02-30").valid, false);
  assert.equal(validateShowtimeQuery("Film", "2026-10-16").valid, true);
  assert.equal(validateShowtimeQuery("x".repeat(161), "2026-10-16").valid, false);
  assert.equal(validateScheduleDate("2026-10-16").valid, true);
  assert.equal(validateScheduleDate("2026-02-30").valid, false);
});

test("provider keeps unverified catalogue unavailable rather than reporting no screenings", async () => {
  const provider = new StarCineplexProvider();
  const branches = await provider.getLocations();
  assert.equal(branches.state, "available");
  assert.equal(branches.capability, "branches");
  assert.equal(branches.freshness, "dated_snapshot");
  assert.equal(branches.capabilities.catalogue, "provider_unavailable");
  assert.equal(branches.capabilities.showtimes, "provider_unavailable");
  assert.equal(branches.capabilities.prices, "data_unavailable");
  const catalogue = await provider.getMovies();
  assert.equal(catalogue.state, "unavailable");
  assert.equal(catalogue.availabilityState, "provider_unavailable");
  assert.equal(catalogue.capability, "catalogue");
  const result = await provider.getShowtimes("Example", "2026-10-16");
  assert.equal(result.state, "unavailable");
  assert.equal(result.availabilityState, "provider_unavailable");
  assert.equal(result.capability, "showtimes");
  assert.equal((await provider.getDailySchedule("2026-10-16")).state, "unavailable");
});

test("authorized provider adapters are injectable while the production default stays inactive", async () => {
  const defaultProvider = new StarCineplexProvider();
  assert.equal((await defaultProvider.getMovies()).state, "unavailable");

  const fallback = await defaultProvider.getDailySchedule("2026-10-16");
  let requestedDate = "";
  const configuredProvider = new StarCineplexProvider({
    getDailySchedule: async (date) => {
      requestedDate = date;
      return fallback;
    },
  });
  assert.equal(await configuredProvider.getDailySchedule("2026-10-17"), fallback);
  assert.equal(requestedDate, "2026-10-17");
  assert.equal((await configuredProvider.getMovies()).state, "unavailable");
  assert.equal((await configuredProvider.getShowtimes("Film", "2026-10-17")).state, "unavailable");
});

test("provider request errors are sanitized and private hosts are rejected", async () => {
  await assert.rejects(fetchProviderJson("https://starcineplex.com/feed", async () => {
    throw new Error("internal token must not escape");
  }));
  await assert.rejects(fetchProviderJson("https://example.com/private", async () => new Response("{}")));
  assert.deepEqual(safeProviderRequestError(new Error("secret provider body")), safeProviderError());
});

test("provider request timeout aborts and returns a sanitized error", async () => {
  const keepEventLoopAlive = setTimeout(() => undefined, 50);
  try {
    await assert.rejects(fetchProviderJson("https://starcineplex.com/feed", async (_input, init) => await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("request timed out")), { once: true });
    }), 1));
  } finally {
    clearTimeout(keepEventLoopAlive);
  }
});

test("bounded cache reuses successful values and coalesces duplicate loads", async () => {
  const cache = new BoundedAsyncCache<number>(60_000, 60_000, 2);
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return 42;
  };
  const [first, concurrent] = await Promise.all([cache.get("same", loader), cache.get("same", loader)]);
  assert.equal(first.value, 42);
  assert.equal(concurrent.value, 42);
  assert.equal(calls, 1);
  assert.equal((await cache.get("same", loader)).value, 42);
  assert.equal(calls, 1);
});

test("bounded cache serves a successful entry as stale when refresh fails", async () => {
  const cache = new BoundedAsyncCache<number>(1, 1_000, 1);
  await cache.get("stale", async () => 7);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const result = await cache.get("stale", async () => { throw new Error("upstream down"); });
  assert.equal(result.value, 7);
  assert.equal(result.stale, true);
});

test("bounded cache recovers with fresh data after a stale fallback", async () => {
  const cache = new BoundedAsyncCache<number>(1, 1_000, 1);
  await cache.get("recover", async () => 7);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const stale = await cache.get("recover", async () => { throw new Error("upstream down"); });
  assert.equal(stale.value, 7);
  assert.equal(stale.stale, true);
  const recovered = await cache.get("recover", async () => 9);
  assert.equal(recovered.value, 9);
  assert.equal(recovered.stale, false);
});

test("frontend API client maps HTTP 503, network failure, and invalid JSON separately", async () => {
  const unavailableBody = {
    state: "unavailable",
    message: "No verified feed.",
    source: { provider: "star-cineplex", sourceUrl: "https://starcineplex.com/movies", mode: "provider-feed" },
  };
  const unavailableClient = new CinemaApiClient(async () => new Response(JSON.stringify(unavailableBody), { status: 503 }));
  const unavailable = await unavailableClient.getMovies();
  assert.equal(unavailable.state, "unavailable");
  if (unavailable.state === "unavailable") assert.equal(unavailable.message, "No verified feed.");
  assert.equal((await unavailableClient.getShowtimes("Film", "2026-10-16")).state, "unavailable");
  let dailyPath = "";
  const dailyClient = new CinemaApiClient(async (input) => {
    dailyPath = String(input);
    return new Response(JSON.stringify(unavailableBody), { status: 503 });
  });
  assert.equal((await dailyClient.getDailyShowtimes("2026-10-16")).state, "unavailable");
  assert.match(dailyPath, /\/api\/cinemas\/showtimes\?date=2026-10-16$/);
  const networkClient = new CinemaApiClient(async () => { throw new Error("offline"); });
  assert.equal((await networkClient.getLocations()).state, "network_error");
  const invalidClient = new CinemaApiClient(async () => new Response("not-json", { status: 200 }));
  assert.equal((await invalidClient.getMovies()).state, "invalid_response");
});

test("client refuses malformed successful payloads", async () => {
  const client = new CinemaApiClient(async () => new Response(JSON.stringify({ state: "available", data: {}, source: {} }), { status: 200 }));
  assert.equal((await client.getMovies()).state, "invalid_response");
});

test("client accepts verified showtime response data and safely encodes the movie query", async () => {
  let requestedPath = "";
  const payload = {
    state: "available",
    data: { state: "currently_showing", screenings: [{
      id: "verified-show-1", movieId: "provider-1", movieTitle: "A & B", cinemaId: "BSC", cinemaName: "Example",
      date: "2026-10-16", startsAt: "2026-10-16T13:00:00.000Z", format: "2D", availability: "unknown",
      officialBookingUrl: "https://starcineplex.com/showtimes",
    }] },
    source: { provider: "star-cineplex", sourceUrl: "https://starcineplex.com/showtimes", mode: "provider-feed", fetchedAt: "2026-10-16T10:00:00.000Z" },
  };
  const client = new CinemaApiClient(async (input) => {
    requestedPath = String(input);
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  const result = await client.getShowtimes("A & B", "2026-10-16");
  assert.equal(result.state, "success");
  assert.match(requestedPath, /movie=A\+%26\+B/);
  if (result.state === "success") assert.equal(result.data.screenings[0].availability, "unknown");
});

test("client matches a movie by IMDb identifier and keeps title/year collisions unresolved", () => {
  const client = new CinemaApiClient(async () => new Response("{}"));
  const movie = { imdbID: "tt123", Title: "The Gift", Year: "2015" };
  const providerMovies = [
    { providerMovieId: "1", imdbId: "tt000", title: "The Gift", alternateTitles: [], releaseYear: 2000, formats: [] },
    { providerMovieId: "2", imdbId: "tt123", title: "Different provider title", alternateTitles: ["The Gift"], releaseYear: 2015, formats: [] },
  ];
  const match = client.matchMovie(movie, providerMovies);
  assert.equal(match.state, "matched");
  if (match.state === "matched") assert.equal(match.candidate.providerMovieId, "2");

  const ambiguous = client.matchMovie({ imdbID: "tt999", Title: "The Gift", Year: "" }, providerMovies);
  assert.equal(ambiguous.state, "unresolved");
});

test("showtime filtering honors branch and date and sorts Bangladesh-local screenings", () => {
  const values = normalizeShowtimes({ showtimes: [
    { id: "late", startsAt: "2026-10-16T21:00:00+06:00", availability: "unknown" },
    { id: "early", startsAt: "2026-10-16T13:00:00+06:00", availability: "available" },
    { id: "other-branch", startsAt: "2026-10-16T14:00:00+06:00", availability: "available" },
  ] }, context).screenings.map((showtime, index) => ({
    ...showtime,
    cinemaId: index === 2 ? "BLI" : "BSC",
  }));
  assert.deepEqual(filterAndSortShowtimes(values, "2026-10-16", "BSC").map((item) => item.id), ["early", "late"]);
  assert.deepEqual(filterAndSortShowtimes(values, "2026-10-17", "all"), []);
});

test("safe booking link only accepts the verified official site and uses safe fallback", () => {
  assert.equal(safeBookingUrl("https://starcineplex.com/showtimes"), "https://starcineplex.com/showtimes");
  assert.equal(safeBookingUrl("https://starcineplex.com.evil.example/tickets"), "https://starcineplex.com/showtimes");
  assert.equal(safeBookingUrl("javascript:alert(1)"), "https://starcineplex.com/showtimes");
});

test("calendar helpers use Asia/Dhaka without inventing supported availability", () => {
  assert.equal(dhakaDate(new Date("2026-10-15T20:00:00.000Z")), "2026-10-16");
  assert.equal(addCalendarDays("2026-10-16", 1), "2026-10-17");
});

test("normalizer honors Bangladesh calendar dates across UTC midnight", () => {
  const parsed = normalizeShowtimes({ showtimes: [{ id: "after-midnight", startsAt: "2026-10-15T20:30:00.000Z" }] }, context);
  assert.equal(parsed.screenings[0].date, "2026-10-16");
});

test("aborted old movie requests cannot supply a current result", async () => {
  const client = new CinemaApiClient(async (_input, init) => await new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  const controller = new AbortController();
  const pending = client.getShowtimes("Old title", "2026-10-16", controller.signal);
  controller.abort();
  const result = await pending;
  assert.equal(result.state, "network_error");
  assert.equal(controller.signal.aborted, true);
});

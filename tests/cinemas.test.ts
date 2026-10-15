import assert from "node:assert/strict";
import test from "node:test";
import { BoundedAsyncCache } from "../lib/cinemas/cache";
import { matchMovieTitle } from "../lib/cinemas/matching";
import { normalizeShowtimes, safeProviderError } from "../lib/cinemas/normalize";
import { validateShowtimeQuery } from "../lib/cinemas/query-validation";
import { fetchProviderJson, safeProviderRequestError } from "../lib/cinemas/request";
import { StarCineplexProvider } from "../lib/cinemas/star-cineplex";

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

  assert.equal(parsed.state, "currently_showing");
  assert.equal(parsed.screenings[0].startsAt, "2026-10-16T09:30:00.000Z");
  assert.equal(parsed.screenings[0].price?.amount, 550);
  assert.equal(parsed.screenings[0].seatsRemaining, 18);
});

test("empty schedules mean no match, while malformed payloads are provider errors", () => {
  assert.deepEqual(normalizeShowtimes({ showtimes: [] }, context), { state: "no_matching_screenings", screenings: [] });
  assert.throws(() => normalizeShowtimes({ unexpected: true }, context));
  assert.deepEqual(safeProviderError(), { state: "provider_error", message: "Star Cineplex schedule request failed." });
});

test("unknown availability is not sold out; sold out requires an explicit provider status", () => {
  const parsed = normalizeShowtimes({ showtimes: [
    { id: "unknown", startsAt: "2026-10-16T12:00:00Z" },
    { id: "sold", startsAt: "2026-10-16T13:00:00Z", availability: "sold_out", seatsRemaining: 0 },
  ] }, context);
  assert.equal(parsed.screenings[0].availability, "unknown");
  assert.equal(parsed.screenings[1].availability, "sold_out");
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
});

test("query validation bounds movie text and requires a real ISO calendar date", () => {
  assert.equal(validateShowtimeQuery("A", "2026-10-16").valid, false);
  assert.equal(validateShowtimeQuery("Film", "2026-02-30").valid, false);
  assert.equal(validateShowtimeQuery("Film", "2026-10-16").valid, true);
  assert.equal(validateShowtimeQuery("x".repeat(161), "2026-10-16").valid, false);
});

test("provider keeps unverified catalogue unavailable rather than reporting no screenings", async () => {
  const provider = new StarCineplexProvider();
  const result = await provider.getShowtimes("Example", "2026-10-16");
  assert.equal(result.state, "unavailable");
});

test("provider request errors are sanitized and private hosts are rejected", async () => {
  await assert.rejects(fetchProviderJson("https://starcineplex.com/feed", async () => {
    throw new Error("internal token must not escape");
  }));
  await assert.rejects(fetchProviderJson("https://example.com/private", async () => new Response("{}")));
  assert.deepEqual(safeProviderRequestError(new Error("secret provider body")), safeProviderError());
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

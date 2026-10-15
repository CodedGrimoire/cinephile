# Star Cineplex integration

## Architecture

Cinema code is isolated under `lib/cinemas`. `types.ts` holds the domain model; `star-cineplex.ts` is the provider adapter; `normalize.ts` maps a canonical, permitted feed payload into domain showtimes; `matching.ts` matches IMDb-backed Cinephile titles conservatively; `request.ts` provides an 8-second timeout and official-host allowlist for a future verified feed; and `cache.ts` coalesces duplicate work in a bounded process-local cache.

`app/components/CinemaShowtimes.tsx` opens the integration from a single wishlist dialog. The wishlist stores no new fields; it passes the existing IMDb ID, title, and year into the panel. The panel fetches only while open, matches provider movie records before asking for showtimes, aborts superseded requests, and filters/sorts returned screenings by branch and date. Bangladesh-local dates and display times use `Asia/Dhaka`. The app continues to use the existing Firestore list fields and movie details modal.

## Source and access status

The legacy official URLs `cineplexbd.com` and `ticket.cineplexbd.com` currently redirect to [starcineplex.com](https://starcineplex.com/). Its public [branch directory](https://starcineplex.com/branches) lists nine branches, and the public [showtimes page](https://starcineplex.com/showtimes) says its schedule covers the next seven days. The official page returned to the research browser exposed the schedule UI but no actual movie/date/showtime records or documented feed/API. The branch directory snapshot in the adapter was transcribed from the official public page on 2026-10-15; it is not a live fetch.

The community references are not treated as authorized sources. `mahi160/cineplex` describes obtaining a session by using a real browser against the ticket site so its guest flow can handle reCAPTCHA. `hasan-mahmud99/Cineplex-Tracker` describes the same approach and then calls `cineplex-ticket-api.cineplexbd.com` endpoints. That is an undocumented/private access path involving CAPTCHA/session handling, so this implementation does not use it. The supplied community code and public pages do not establish a supported schedule endpoint, rate limits, or permission to use those calls.

As a result, branch names and addresses are returned from a dated official-directory snapshot. Movie listings and showtimes explicitly return `unavailable` (HTTP 503). Seat availability and per-show ticket prices are also unavailable. No movie, schedule, price, or seat data are invented. The normalization utility and fixture use a clearly synthetic canonical payload only; they do not claim to parse a real Star Cineplex response.

## Configuration

No provider credential or environment variable is configured. Do not add a ticket-site token or scrape/replay private API calls. When Star Cineplex provides an authorized feed or documented integration contract, implement its fetch and schema mapping in `StarCineplexProvider`, with a short timeout and sanitized provider errors, then add response fixtures from permitted responses.

## Routes

### `GET /api/cinemas`

Returns the nine-branch official-directory snapshot with source date and source URL. CDN caching is one day; the adapter data should be refreshed when the official directory changes.

```bash
curl -i http://localhost:3000/api/cinemas
```

### `GET /api/cinemas/movies`

Returns `503` with `{ "state": "unavailable", ... }` until an authorized public movie feed is configured.

```bash
curl -i http://localhost:3000/api/cinemas/movies
```

### `GET /api/cinemas/showtimes?movie=...&date=YYYY-MM-DD`

Requires a 2–160 character movie query and a real ISO calendar date. Invalid input returns `400`. A verified feed would return `currently_showing` or `no_matching_screenings`; currently it returns `503 unavailable`.

```bash
curl -i 'http://localhost:3000/api/cinemas/showtimes?movie=Dune%3A%20Part%20Two&date=2026-10-16'
```

Available data includes typed `source` metadata (`provider`, `sourceUrl`, `fetchedAt`, and `mode`; `stale` is included when serving an old cached response). Unavailable/error responses carry `checkedAt` instead of implying data was fetched. Unexpected upstream failures map to a generic `provider_error`/HTTP 502 without exposing provider internals. `unavailable` and `provider_error` are never represented as no screenings.

## Error and availability semantics

- `currently_showing`: the retrieved schedule contains matching screenings.
- `no_matching_screenings`: a successfully retrieved schedule contains none for the query.
- `unavailable`: no verified/authorized feed is configured or usable.
- `provider_error`: a configured provider request or payload fails.
- `unknown`: availability was omitted or unrecognized.
- `sold_out`: only a provider response explicitly marks the screening sold out.

Ticket price and seats remaining are omitted unless the feed provides valid values. Indicative branch price cards are intentionally not attached to an individual showtime.

## Cache

Successful listing responses use a 12-minute bounded in-process cache with duplicate request coalescing and a 30-minute stale-if-error window. API cache headers give deployment CDNs the same 12-minute target. Errors and unavailable responses are not cached. The in-process cache is per server instance and is not treated as shared storage; a deployment needing cross-instance consistency should use its CDN or add a shared cache after the hosting architecture is confirmed. Seat availability is not polled.

## Matching

`matchMovieTitle` accepts existing IMDb-style records and provider titles/aliases. It prefers an exact IMDb ID, otherwise normalizes case, punctuation, Unicode accents, and `&`/`and`, and uses release year to resolve title collisions. Conflicting IMDb IDs are not matched by title fallback. Fuzzy/similarity matches are not accepted. Ambiguous and unresolved results remain explicit.

## Wishlist showtimes experience

`Cinema Showtimes` appears on each My Watchlist card and opens one modal for the selected movie. It shows the dated branch directory as a snapshot, an Asia/Dhaka date input, and grouped showtimes when an authorized provider response is available. It displays optional format, availability, seat count, price, and direct booking action only when a validated response supplies those fields. Unknown seat availability remains explicit. The generic booking link always points to the official schedule page; direct URLs are accepted only on HTTPS `starcineplex.com` hosts.

The current 503 provider response displays: “Star Cineplex showtimes are currently unavailable. Check the official website for the latest schedule.” Network failures, invalid responses, unmatched catalogue titles, and successful empty schedules have separate states. A cinema branch/date filter never turns a provider failure into a no-showings claim. No polling or booking automation is used.

## Verification

With dependencies installed, run `npx tsc --noEmit`, `npm run lint`, `npm run test:cinemas`, and `npm run build`. Tests are in `tests/cinemas.test.ts`; fixtures are synthetic and isolated to tests. Coverage includes normalization, empty and malformed schedules, availability semantics, matching ambiguity/IMDb IDs, parameter validation, provider-unavailable behavior, cache behavior, wishlist panel state, client response states, filtering, booking URLs, and cancellation. Live showtime retrieval has not been verified and is not claimed to work.

## Remaining work

To make live retrieval operational, obtain written/public provider access details (feed URL/schema, permitted authentication, rate limits, and cache rules), verify a real response, and add permitted response fixtures. Seat-level availability and notifications remain future work; seat data should stay opt-in and non-polling unless the provider documents a supported method.

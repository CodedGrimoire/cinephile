# Star Cineplex integration

## Status verified 2026-10-15

Cinephile currently provides a dated nine-branch directory snapshot. It does not ingest the official movie catalogue, dated showtimes, prices, or seat inventory. The official site publicly renders some of those details, but this review could not verify permission for automated retrieval or a documented feed. No live data is represented as integrated.

The official pages examined were:

- [Home](https://starcineplex.com/)
- [Now Showing](https://starcineplex.com/movies?status=now-showing)
- [Coming Soon](https://starcineplex.com/movies?status=coming-soon)
- [Showtimes](https://starcineplex.com/showtimes)
- [Branches](https://starcineplex.com/branches)
- [Ticket prices](https://starcineplex.com/ticket-price)
- [Contact](https://starcineplex.com/contact)
- `https://starcineplex.com/robots.txt`

The official home page and search-indexed page content currently expose Now Showing and Coming Soon titles, genres, language, runtime, and formats; some movie content includes a year. Branch pages expose branch identifiers and addresses, halls and hall capacities, and showtime listings. The showtimes page is a public schedule entry point. The ticket price guide exposes seat-class and time-band prices and describes those prices as indicative; it says the exact price appears at seat selection. These pages demonstrate what the official site publishes, but not a permission to harvest or redistribute it.

Machine-readable status is unverified. Search/browser rendering showed dynamic page content, but no documented public API/export/feed or reliable response schema was found. No consistent release-date or provider movie identifier was verified. Branch pages surfaced times, but this review could not verify a durable date/branch/movie schedule payload. Seat inventory was not exposed as a supported source. `robots.txt` could not be retrieved by the research browser, and direct HTTPS access from the development environment failed with DNS resolution error (`curl: (6) Could not resolve host: starcineplex.com`). No automation policy or terms authorizing programmatic reuse were found. The official contact page lists hotline `09617660660` / `01755665544` and an email link; ask the operator for written terms and a read-only feed.

The dates and details above are a source review, not an assertion that the page content stays current. Movie and showtime pages may change daily. Community code that describes browser sessions, CAPTCHA or ticket API access is not an authorized source and is not used.

## Capability matrix

| Capability | Cinephile status | Evidence and limit |
|---|---|---|
| Branch directory | Available as a dated snapshot | Official branch directory lists nine branches. The API snapshot was transcribed on 2026-10-15; it is not refreshed automatically. |
| Now Showing / Coming Soon catalogue | Provider unavailable | Current titles are publicly rendered on official pages, but there is no verified authorized machine-readable source. |
| Date-specific showtimes | Provider unavailable | Official pages display showtime content, but no permitted feed and stable date/branch response were verified. No individual times are imported. |
| Ticket prices | Data unavailable in Cinephile | Official indicative prices are public, but are not attached to a show or verified via a permitted feed. Exact show price is said to appear at seat selection. |
| Seat availability | Provider unavailable | No authorized live inventory source was found. Never infer seats available or sold out from a schedule or venue capacity. |

The capability metadata is included in all provider results. `availabilityState` and `freshness` make unavailable and dated data explicit. `provider_unavailable` means no verified provider integration is configured; `data_unavailable` means this Cinephile capability has no usable data. These states are not empty successful listings. The normalization contract distinguishes `confirmed_no_screenings` from `screening_scheduled`, and screening availability distinguishes `availability_unknown`, `seats_available`, and `sold_out`. A title is not classified as `not_in_current_catalogue` unless a current, complete catalogue can be verified; that evidence is not available today.

## Architecture and API

Cinema integration lives under `lib/cinemas`. `star-cineplex.ts` provides the branch snapshot and unavailable states. `matching.ts` accepts exact IMDb identifiers or conservative normalized title/year matches; ambiguous and unresolved results remain separate. `normalize.ts` validates a canonical authorized schedule response shape, but its test input is synthetic and is not a real Star Cineplex payload. `request.ts` enforces HTTPS, a Star Cineplex host allowlist, an 8-second timeout, and sanitized errors for a future verified source. No provider credentials are currently configured.

All three routes return `source`, `capability`, `capabilities`, `availabilityState`, `freshness`, and `matchConfidence` (`not_applicable` until a catalogue is verified). For example, the branches endpoint returns `state: "available"`, `capability: "branches"`, `freshness: "dated_snapshot"`, a `retrievedAt` timestamp, and a `source` URL. Its branch rows are in `data`. The movie and showtime endpoints return HTTP 503 with `state: "unavailable"`, `availabilityState: "provider_unavailable"`, `freshness: "not_retrieved"`, and no fabricated listing. Unexpected errors return HTTP 502 with a sanitized `provider_error`. Invalid showtime query parameters return HTTP 400.

```bash
curl -i http://localhost:3000/api/cinemas
curl -i http://localhost:3000/api/cinemas/movies
curl -i 'http://localhost:3000/api/cinemas/showtimes?date=2026-10-16'
curl -i 'http://localhost:3000/api/cinemas/showtimes?movie=Dune%3A%20Part%20Three&date=2026-10-16'
```

Local API response examples captured on 2026-10-15 (these are Cinephile responses, not provider feed payloads): `/api/cinemas` returned HTTP 200 with `state: "available"`, `capability: "branches"`, `availabilityState: "data_available"`, `freshness: "dated_snapshot"`, and nine rows; the first row was Bali Arcade, Chattogram. `/api/cinemas/movies` returned HTTP 503 with `capability: "catalogue"`, `availabilityState: "provider_unavailable"`, `freshness: "not_retrieved"`, and a provider `checkedAt`. Both `/api/cinemas/showtimes?date=2026-10-16` and the compatible movie-filtered form returned HTTP 503 with `capability: "showtimes"`. An invalid calendar date returned HTTP 400. No actual Star Cineplex schedule payload was obtained.

The My Watchlist page contains a “Your Watchlist at Star Cineplex” section. It requests one date-specific schedule for the full cinema, then displays only the mutual set: movies in the user's watchlist that also have a screening in the verified schedule. Matching requires an exact provider IMDb ID or an exact normalized title and release year; ambiguous or incomplete matches are omitted. Matching screenings are grouped by watchlist movie with branch, Bangladesh-local time, format, availability state, and source freshness. An unavailable source shows an explicit message and the official schedule link; it does not substitute wishlist titles or sample listings. The earlier per-wishlist cinema button and modal have been removed. The existing per-movie API query remains supported for compatibility.

## Configuration contract for authorized access

No credentials or feed URL are set. After written authorization, configure server-only `STAR_CINEPLEX_FEED_URL` and, only if required by the provider, `STAR_CINEPLEX_FEED_TOKEN`. The URL must be an explicitly approved HTTPS endpoint, and the provider adapter must allowlist its exact host and documented paths. The token must remain server-side, never be returned to clients or logged. Do not add a user-controlled upstream URL, generic proxy, browser session, CAPTCHA flow, undocumented ticket endpoint, or automatic ticket purchase. Record allowed request rates, cache rules, attribution, and the feed schema with the authorization.

## Cache and reliability

The bounded process-local cache uses a 12-minute successful schedule TTL, a 30-minute stale-if-refresh-fails window, a 100-entry cap, and duplicate request coalescing. Schedule data is cached only when seat availability is explicitly unknown and no remaining-seat count is present; responses carrying live availability or seat counts use `Cache-Control: no-store` and bypass the schedule cache. A future authorized seat inventory source must use a separate, shorter-lived cache. Errors and unavailable responses are not cached. A stale result is marked stale in both source metadata and freshness metadata. Branch snapshot freshness is `dated_snapshot`; it is never labelled live. Provider requests have an 8-second timeout and errors are sanitized. The provider receives only cinema query values, never Firebase or Firestore credentials.

## Provider access request template

**Subject: Request for read-only Star Cineplex cinema information feed**

Hello Star Cineplex team,

I am developing Cinephile, a personal movie watchlist application. I would like to ask whether Star Cineplex can authorize read-only access to an official feed or API for:

- Branch identifiers, names, and addresses
- Now Showing and Coming Soon movie catalogue, including provider movie IDs, original/alternate titles, and release dates where available
- Date-specific showtimes by branch, including local date/time, format, and hall/screen
- Published ticket prices and their applicable seat classes/time bands
- Seat availability, if this may be shared outside the ticketing flow
- Official booking links

Please also share the permitted authentication method, rate limits, cache/freshness requirements, attribution requirements, data retention limits, and any restrictions on public display. Cinephile only needs read access and will not place or automate ticket purchases. We will not use CAPTCHA/session workarounds or undocumented private endpoints.

Thank you,
\[Name / contact\]

## Validation and blockers

`npm ci --no-audit --no-fund` completed successfully on 2026-10-15. The package manifest and both tracked lockfiles were retained: the README supports npm, Yarn, and pnpm, and the npm lock install completed successfully. After the mutual watchlist/schedule intersection change, `npm run test:cinemas` passed all 24 tests, including exact IMDb ID, exact title/year, and ambiguous-match cases; `npx tsc --noEmit` passed; `npm run lint` exited successfully with 13 warnings (mostly raw `<img>` usage and hook dependency warnings, none in the cinema integration). In an isolated copy, Next.js compiled `/mylist` and returned HTTP 200; the date-wide showtime API returned 503 as expected without an authorized feed, and rejected an invalid date with 400. Earlier dev-server checks returned HTTP 200 for `/` and `/homepage`, and 200 for the branch API. `npm run build` was attempted in the isolated copy so it would not overwrite the workspace's pre-existing deleted `.next` artifacts; it failed because DNS/network access could not resolve `fonts.googleapis.com`, which Next's `next/font` needs for Geist and Geist Mono. No full build pass is claimed. Browser console inspection and Firebase sign-in/Firestore actions were not performed; browser control could not initialize in this environment, and no valid test account was available.

Remaining blockers are written permission and a documented, stable feed contract for catalogue/showtimes/prices/seats; access to the host from this development environment; and current confirmation of the branch snapshot. Firebase login and Firestore watchlist behavior have not been manually tested as part of this integration.

To activate the higher capability levels, obtain the written provider access above, verify a real permitted payload and its freshness, add a sanitized real-response fixture, implement the source adapter and cache rules, and then enable each capability independently. Do not claim any feature works based only on this document or on public website visibility.

# Star Cineplex live schedule integration

## Current behavior

Cinephile now reads the same public, read-only JSON endpoints used by the Star Cineplex frontend:

- Movies: https://api.kichole.com/catalog/api/movies
- Venues: https://api.kichole.com/catalog/api/venues
- Shows: https://api.kichole.com/inventory/api/shows

The server sends ordinary HTTPS GET requests with an Accept: application/json header. It sends no Origin, browser headers, cookies, or bearer token; cookies are explicitly omitted and redirects are rejected. It does not call the organization-protected halls route or any seat-locking, booking, payment, or reservation operation.

Show records are joined to movies by movieId and venues by venueId. Cinephile uses the date carried on each show record and its local HH:mm value; it does not infer a calendar date from a repeated clock time. The time is interpreted in Asia/Dhaka. Movie matching first uses a matching TMDb ID if that optional ID is present in the wishlist. Current wishlist records contain IMDb IDs, not TMDb IDs, so the normal path requires an exact normalized English or Bengali title and matching release year. A unique exact base-title match is allowed for Star's explicit “Encore” re-release suffix; ambiguous matches remain excluded. Fuzzy title similarity is not used.

Prices are converted from paisa to BDT and shown as the provider's min–max range. Available seats and sales status are displayed as provider-reported snapshots with the retrieval time. They are not reservations or guarantees. Past showtimes on the current Bangladesh date are filtered out. If the API has not published the selected date, Cinephile reports that schedule as unavailable rather than claiming there are no screenings.

Available schedules are cached per server process for 60 seconds, with concurrent requests coalesced. A manual refresh bypasses and replaces that entry. Provider errors are not cached, and expired seat snapshots are never served. Because this is in-process memory, serverless instances have separate caches and a cold/new instance fetches its own snapshot; this is a short traffic reduction window, not shared or durable caching. Upstream calls have an 8-second timeout and at most one retry for 429/502/503/504 responses; Retry-After is capped at two seconds. No credentials are exposed to browser clients.

## Independent-access verification (2026-10-15)

Unauthenticated GETs from a server-side Node process, without cookies or browser headers, returned HTTP 200 JSON:

| Endpoint | Response |
|---|---|
| /catalog/api/movies | 39 movie records |
| /catalog/api/venues | 9 venue records |
| /inventory/api/shows | 300 show records across 2026-10-15, 2026-10-16, and 2026-10-17 |

All 300 schedule rows joined to a returned movie and venue in the observed response. Records included explicit date, time, movieId, venueId, hallId, format, status, availableSeats, totalSeats, and priceRange. The response headers did not include Retry-After or rate-limit headers. A date=2026-10-15 query still returned 300 rows across all three dates, so Cinephile filters only on the explicit date field in each record.

At 2026-10-15 10:35 UTC, Cinephile's production API route returned 100 records for 2026-10-16 after joining and validation. It returned 35 future screenings for 2026-10-15 at 16:35 Bangladesh time; every returned same-day start time was after the request time. Five real records from the 2026-10-16 response were:

- Avengers Endgame: Encore · Bali Arcade, Chattogram · 2026-10-16 11:00 · 2D · BDT 500 · 85 seats reported · Selling
- Spider-Man: Brand New Day · Bashundhara City Shopping Mall, Panthapath · 2026-10-16 11:00 · 2D · BDT 850 · 113 seats reported · Selling
- Street Fighter · Bashundhara City Shopping Mall, Panthapath · 2026-10-16 11:10 · 2D · BDT 550–650 · 241 seats reported · Selling
- Spider-Man: Brand New Day · Bali Arcade, Chattogram · 2026-10-16 11:15 · 2D · BDT 500 · 125 seats reported · Selling
- Resident Evil · Centrepoint, Uttara · 2026-10-16 11:15 · 2D · BDT 650 · 175 seats reported · Selling

The exact source for these records was https://api.kichole.com/inventory/api/shows; the route response timestamp was 2026-10-15T10:35:27.098Z. The app's repeated request reused the same timestamp; a forced refresh produced a new timestamp and replaced the cached value.

### Wishlist matching spot checks (2026-10-15)

The live 2026-10-16 Cinephile response was also checked against representative wishlist title/year values (isolated match candidates, not a user's Firestore list). Each candidate matched one real screening:

| Screening title | Provider release date / Bangladesh date | Match checked |
|---|---|---|
| Resident Evil | 2026-09-16 / 2026-10-02 | Exact title and year |
| Digger | 2026-09-30 / 2026-10-02 | Exact title and year |
| Mutiny | 2026-08-19 / 2026-09-25 | Exact title and year |
| Spider-Man: Brand New Day | 2026-01-01 / not supplied | Exact full title, including subtitle |
| Avengers Endgame: Encore | 2026-09-25 / 2026-09-25 | Unique “Avengers: Endgame” base title (0.9 confidence) |

The provider's Bengali title was also matched as an alternate title. These checks validate the normal current wishlist fields (IMDb ID, title, year) using exact title/year and supplied aliases. Existing Firestore wishlist records do not contain TMDb IDs, so stable TMDb matching is not available to the current signed-in user's data without a separate verified mapping.

The public halls request /catalog/api/halls?venueId=…&orgId=… returned HTTP 403 with FORBIDDEN_ORG / “You are not a member of this organization.” Cinephile does not retry it with credentials or otherwise attempt to obtain hall names. The schedule provides hallId, but the current UI does not display a hall name.

## Access conditions and limits

The public Star Cineplex site frontend references these read endpoints. The direct requests above succeeded without authentication. No published API usage terms, rate limit, or explicit automated-use permission were found. https://starcineplex.com/terms, /terms-of-use, /terms-and-conditions, both robots.txt paths, and the API Swagger paths returned 404. This is not evidence of an API license or an unlimited request allowance; the implementation therefore uses only the frontend's public GET resources, limits request frequency with a short cache, and does not access organization-protected or state-changing routes. No rate limit was advertised in the observed response headers.

## UI

The existing Watchlist at Star Cineplex section requests the selected date when opened, displays only confidently matched watchlist titles, sorts by local showtime, and shows branch, date, time, format, price range, reported seat count, sales status, last-updated time, and an official schedule link. Refresh requests a new snapshot. If the provider fails validation or is unreachable, the UI reports the data unavailable rather than using old seat counts.

## Verification

- npm run test — 27 tests passed.
- npx tsc --noEmit — passed.
- npm run lint — passed with 13 existing warnings for image elements and hook dependencies outside this integration.
- npm run build — passed. The build reports existing image-optimization and React hook-dependency warnings outside this integration.
- Production app smoke — /api/cinemas/movies returned 200 with 39 movies; /api/cinemas returned 200 with 9 venues; /api/cinemas/showtimes?date=2026-10-15 returned 200 with 35 future screenings; /api/cinemas/showtimes?date=2026-10-16 returned 200 with 100 joined screenings; cached requests reused the original retrieval timestamp; &refresh=1 returned a newer timestamp and updated the cache.
- Local app smoke — /api/cinemas/showtimes?date=2026-10-16 returned 200 with 100 live records; two sequential requests reused the same fetchedAt, and refresh=1 retrieved a new snapshot. An isolated demo-cinephile Auth/Firestore emulator account and watchlist document were created, written, and read successfully. No production Firestore data was accessed.
- Interactive browser/mobile verification — not completed. The in-app browser failed to initialize with a sandboxPolicy bootstrap error, so no visual, responsive, or console result is claimed.

## Known limitations

- Hall names are unavailable without organization membership; only provider hallId is returned.
- The provider did not publish a rate limit or an explicit automated-use policy. If Star Cineplex provides a usage limit or asks integrations to stop, the client must honor it.
- Seat counts and prices are snapshots and may change before a user books.
- Existing wishlist documents use IMDb IDs and do not include TMDb IDs. Exact title/alias plus year matching is used for them; the optional TMDb path is available only for wishlist records that already carry a verified TMDb ID.
- The existing Firestore rules allow every authenticated user to read and write every document; tighten and validate these rules before deploying the app.

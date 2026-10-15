export type CinemaLocation = {
  id: string;
  name: string;
  branchCode: string;
  address: string;
  city: string;
  officialUrl: string;
};

export type ScreeningFormat = "2D" | "3D" | "IMAX" | "ATMOS" | "UNKNOWN";
export type AvailabilityStatus = "available" | "limited" | "sold_out" | "unknown";
export type ScreeningDate = string;

export type CinemaMovie = {
  providerMovieId: string;
  title: string;
  alternateTitles: string[];
  releaseYear?: number;
  imdbId?: string;
  formats: ScreeningFormat[];
  officialUrl?: string;
};

export type Showtime = {
  id: string;
  movieId: string;
  movieTitle: string;
  movieImdbId?: string;
  movieReleaseYear?: number;
  cinemaId: string;
  cinemaName: string;
  date: ScreeningDate;
  startsAt: string;
  format: ScreeningFormat;
  availability: AvailabilityStatus;
  availabilityState?: "availability_unknown" | "seats_available" | "sold_out";
  price?: { amount: number; currency: "BDT" };
  seatsRemaining?: number;
  officialBookingUrl?: string;
};

export type ScreeningLookupState =
  | "currently_showing"
  | "no_matching_screenings"
  | "unavailable"
  | "provider_error";

export type SourceMetadata = {
  provider: "star-cineplex";
  sourceUrl: string;
  fetchedAt?: string;
  checkedAt?: string;
  mode: "official-public-directory" | "provider-feed";
  stale?: boolean;
};

export type CinemaCapability = "available" | "provider_unavailable" | "data_unavailable";
export type CinemaCapabilityMatrix = {
  branches: CinemaCapability;
  catalogue: CinemaCapability;
  showtimes: CinemaCapability;
  prices: CinemaCapability;
  seats: CinemaCapability;
};

// This reflects what Cinephile can verify through authorized sources, not every
// feature that may be visible on Star Cineplex's own website.
export const STAR_CINEPLEX_CAPABILITIES: CinemaCapabilityMatrix = {
  branches: "available",
  catalogue: "provider_unavailable",
  showtimes: "provider_unavailable",
  prices: "data_unavailable",
  seats: "provider_unavailable",
};

export type CinemaAvailabilityState =
  | "data_available"
  | "provider_unavailable"
  | "data_unavailable"
  | "not_in_current_catalogue"
  | "confirmed_no_screenings"
  | "screening_scheduled"
  | "availability_unknown"
  | "seats_available"
  | "sold_out";

export type ProviderResult<T> =
  | { state: "available"; availabilityState: "data_available"; capability: string; capabilities: CinemaCapabilityMatrix; freshness: "dated_snapshot" | "current" | "stale"; matchConfidence: number | "not_applicable"; retrievedAt?: string; data: T; source: SourceMetadata }
  | { state: "unavailable"; availabilityState: "provider_unavailable" | "data_unavailable"; capability: string; capabilities: CinemaCapabilityMatrix; freshness: "not_retrieved"; matchConfidence: "not_applicable"; message: string; source: SourceMetadata }
  | { state: "provider_error"; availabilityState: "provider_unavailable"; capability: string; capabilities: CinemaCapabilityMatrix; freshness: "not_retrieved"; matchConfidence: "not_applicable"; message: string; source: SourceMetadata };

export type ShowtimeResult = ProviderResult<{
  state: "screening_scheduled" | "confirmed_no_screenings" | "currently_showing" | "no_matching_screenings";
  screenings: Showtime[];
}>;

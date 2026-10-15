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
  cinemaId: string;
  cinemaName: string;
  date: ScreeningDate;
  startsAt: string;
  format: ScreeningFormat;
  availability: AvailabilityStatus;
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

export type ProviderResult<T> =
  | { state: "available"; data: T; source: SourceMetadata }
  | { state: "unavailable"; message: string; source: SourceMetadata }
  | { state: "provider_error"; message: string; source: SourceMetadata };

export type ShowtimeResult = ProviderResult<{
  state: "currently_showing" | "no_matching_screenings";
  screenings: Showtime[];
}>;

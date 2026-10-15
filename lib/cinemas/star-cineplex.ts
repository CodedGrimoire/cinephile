import { STAR_CINEPLEX_CAPABILITIES, type CinemaLocation, type CinemaMovie, type ProviderResult, type ShowtimeResult } from "./types";

const OFFICIAL_ROOT = "https://starcineplex.com";
const DIRECTORY_SNAPSHOT_DATE = "2026-10-15T00:00:00.000Z";

// Snapshot transcribed from the official public branch directory. Refresh when the
// provider offers a supported directory feed; schedule data is never inferred here.
const BRANCHES: CinemaLocation[] = [
  { id: "BLI", branchCode: "BLI", name: "Bali Arcade, Chattogram", address: "Level-9, Bali Arcade, 227 Nawab Sirajuddaula Road, Chawkbazar", city: "Chattogram", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "BMM", branchCode: "BMM", name: "Bangladesh Military Museum, Bijoy Shoroni", address: "Bangladesh Military Museum, Bijoy Sarani, Farmgate, Dhaka-1215", city: "Dhaka", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "BSC", branchCode: "BSC", name: "Bashundhara City Shopping Mall, Panthapath", address: "Level-8, Bashundhara City Shopping Mall, Panthapath, Dhaka-1205", city: "Dhaka", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "CPU", branchCode: "CPU", name: "Centrepoint, Uttara", address: "Level-5, Centrepoint Shopping Mall, United Terminal, Airport Road, Kurmitola, Dhaka-1229", city: "Dhaka", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "FLS", branchCode: "FLS", name: "Finlay Square, Chattogram", address: "Level-6, Finlay Square, East Nasirabad, Gate No. 2", city: "Chattogram", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "SS", branchCode: "SS", name: "Shimanto Shambhar, Dhanmondi 2", address: "Level-9, Shimanto Shambhar, Pilkhana, Dhanmondi-2, Dhaka-1205", city: "Dhaka", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "NRG", branchCode: "NRG", name: "Shimanto Tower, Narayanganj", address: "Level-8, Shimanto Tower, Jalkuri", city: "Narayanganj", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "SKS", branchCode: "SKS", name: "SKS Tower, Mohakhali", address: "Level-3, SKS Tower, Mohakhali, Dhaka-1205", city: "Dhaka", officialUrl: `${OFFICIAL_ROOT}/branches` },
  { id: "SNY", branchCode: "SNY", name: "Sony Square, Mirpur", address: "Level-4, Plot-1, Road-2, Block-D, Section-2, Mirpur, Dhaka-1216", city: "Dhaka", officialUrl: `${OFFICIAL_ROOT}/branches` },
];

function metadata(mode: "official-public-directory" | "provider-feed", sourceUrl: string) {
  const source = {
    provider: "star-cineplex" as const,
    sourceUrl,
    mode,
  };
  return mode === "official-public-directory"
    ? { ...source, fetchedAt: DIRECTORY_SNAPSHOT_DATE }
    : { ...source, checkedAt: new Date().toISOString() };
}

/** Server-side adapter contract for a future source approved by Star Cineplex. */
export type AuthorizedStarCineplexAdapter = {
  getMovies?(): Promise<ProviderResult<CinemaMovie[]>>;
  getShowtimes?(movie: string, date: string): Promise<ShowtimeResult>;
  getDailySchedule?(date: string): Promise<ShowtimeResult>;
};

/** Provider boundary. The production singleton is deliberately constructed without an adapter. */
export class StarCineplexProvider {
  constructor(private readonly authorizedAdapter?: AuthorizedStarCineplexAdapter) {}

  async getLocations(): Promise<ProviderResult<CinemaLocation[]>> {
    return {
      state: "available",
      availabilityState: "data_available",
      capability: "branches",
      capabilities: { ...STAR_CINEPLEX_CAPABILITIES },
      freshness: "dated_snapshot",
      matchConfidence: "not_applicable",
      retrievedAt: DIRECTORY_SNAPSHOT_DATE,
      data: BRANCHES.map((branch) => ({ ...branch })),
      source: metadata("official-public-directory", `${OFFICIAL_ROOT}/branches`),
    };
  }

  async getMovies(): Promise<ProviderResult<CinemaMovie[]>> {
    if (this.authorizedAdapter?.getMovies) return this.authorizedAdapter.getMovies();
    return this.unavailable("catalogue", "provider_unavailable", `${OFFICIAL_ROOT}/movies?status=now-showing`);
  }

  async getShowtimes(movie: string, date: string): Promise<ShowtimeResult> {
    if (this.authorizedAdapter?.getShowtimes) return this.authorizedAdapter.getShowtimes(movie, date);
    return this.unavailable("showtimes", "provider_unavailable", `${OFFICIAL_ROOT}/showtimes`);
  }

  async getDailySchedule(date: string): Promise<ShowtimeResult> {
    if (this.authorizedAdapter?.getDailySchedule) return this.authorizedAdapter.getDailySchedule(date);
    return this.unavailable("showtimes", "provider_unavailable", `${OFFICIAL_ROOT}/showtimes`);
  }

  private unavailable<T>(capability: string, availabilityState: "provider_unavailable" | "data_unavailable", sourceUrl: string): ProviderResult<T> {
    return {
      state: "unavailable",
      availabilityState,
      capability,
      capabilities: { ...STAR_CINEPLEX_CAPABILITIES },
      freshness: "not_retrieved",
      matchConfidence: "not_applicable",
      message: "No verified, authorized Star Cineplex data feed is configured for this capability.",
      source: metadata("provider-feed", sourceUrl),
    };
  }
}

export const starCineplexProvider = new StarCineplexProvider();

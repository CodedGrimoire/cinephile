import type { AvailabilityStatus, ScreeningFormat, Showtime } from "./types";
import { dateInTimezone } from "./calendar";

export type NormalizationContext = {
  movieId: string;
  movieTitle: string;
  cinemaId: string;
  cinemaName: string;
  date: string;
};

export class ProviderPayloadError extends Error {
  constructor() {
    super("Star Cineplex returned an unreadable schedule payload.");
    this.name = "ProviderPayloadError";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function formatOf(value: unknown): ScreeningFormat {
  if (typeof value !== "string") return "UNKNOWN";
  const normalized = value.trim().toUpperCase();
  if (["2D", "3D", "IMAX", "ATMOS"].includes(normalized)) return normalized as ScreeningFormat;
  return "UNKNOWN";
}

function availabilityOf(value: unknown): AvailabilityStatus {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (normalized === "available") return "available";
  if (normalized === "limited") return "limited";
  if (normalized === "sold_out" || normalized === "sold out") return "sold_out";
  return "unknown";
}

function officialBookingUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && (url.hostname === "starcineplex.com" || url.hostname.endsWith(".starcineplex.com"))) return url.toString();
  } catch { /* Ignore malformed upstream URLs. */ }
  return undefined;
}

/** Normalize a canonical, permitted provider feed response. This is not a parser for the undocumented ticket API. */
export function normalizeShowtimes(payload: unknown, context: NormalizationContext): {
  state: "currently_showing" | "no_matching_screenings";
  screenings: Showtime[];
} {
  const envelope = asRecord(payload);
  if (!envelope || !Array.isArray(envelope.showtimes)) throw new ProviderPayloadError();

  const screenings: Showtime[] = [];
  for (const item of envelope.showtimes) {
    const row = asRecord(item);
    if (!row || typeof row.id !== "string" || typeof row.startsAt !== "string") throw new ProviderPayloadError();
    const startsAt = new Date(row.startsAt);
    if (!Number.isFinite(startsAt.getTime()) || dateInTimezone(startsAt, "Asia/Dhaka") !== context.date) throw new ProviderPayloadError();

    const priceRecord = asRecord(row.price);
    const priceAmount = priceRecord?.amount;
    const price = typeof priceAmount === "number" && Number.isFinite(priceAmount) && priceAmount >= 0 && priceRecord?.currency === "BDT"
      ? { amount: priceAmount, currency: "BDT" as const }
      : undefined;
    const remaining = row.seatsRemaining;
    screenings.push({
      id: row.id,
      movieId: context.movieId,
      movieTitle: context.movieTitle,
      cinemaId: context.cinemaId,
      cinemaName: context.cinemaName,
      date: context.date,
      startsAt: startsAt.toISOString(),
      format: formatOf(row.format),
      availability: availabilityOf(row.availability),
      ...(price ? { price } : {}),
      ...(typeof remaining === "number" && Number.isInteger(remaining) && remaining >= 0 ? { seatsRemaining: remaining } : {}),
      ...(officialBookingUrl(row.bookingUrl) ? { officialBookingUrl: officialBookingUrl(row.bookingUrl) } : {}),
    });
  }
  return { state: screenings.length ? "currently_showing" : "no_matching_screenings", screenings };
}

export function safeProviderError(): { state: "provider_error"; message: string } {
  return { state: "provider_error", message: "Star Cineplex schedule request failed." };
}

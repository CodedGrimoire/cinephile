import { NextRequest, NextResponse } from "next/server";
import { validateScheduleDate, validateShowtimeQuery } from "@/lib/cinemas/query-validation";
import { getCachedDailySchedule } from "@/lib/cinemas/schedule-service";
import { STAR_CINEPLEX_CAPABILITIES } from "@/lib/cinemas/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const movieQuery = request.nextUrl.searchParams.get("movie");
  const dateQuery = request.nextUrl.searchParams.get("date");
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const dateValidation = validateScheduleDate(dateQuery);
  const movieValidation = request.nextUrl.searchParams.has("movie")
    ? validateShowtimeQuery(movieQuery, dateQuery)
    : null;
  if (!dateValidation.valid || (movieValidation && !movieValidation.valid)) {
    const message = !dateValidation.valid ? dateValidation.message : movieValidation && !movieValidation.valid ? movieValidation.message : "Invalid request.";
    return NextResponse.json({ state: "invalid_request", message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const date = dateValidation.value;
  const movie = movieValidation?.valid ? movieValidation.value.movie : undefined;

  try {
    const result = await getCachedDailySchedule(date, movie, forceRefresh);
    const status = result.state === "available" ? 200 : result.state === "unavailable" ? 503 : 502;
    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({
      state: "provider_error",
      availabilityState: "provider_unavailable",
      capability: "showtimes",
      capabilities: STAR_CINEPLEX_CAPABILITIES,
      freshness: "not_retrieved",
      matchConfidence: "not_applicable",
      message: "Showtimes could not be retrieved from Star Cineplex.",
      source: { provider: "star-cineplex", sourceUrl: "https://api.kichole.com/inventory/api/shows", checkedAt: new Date().toISOString(), mode: "provider-feed" },
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { showtimeCache, withStaleMetadata } from "@/lib/cinemas/route-cache";
import { validateShowtimeQuery } from "@/lib/cinemas/query-validation";
import { starCineplexProvider } from "@/lib/cinemas/star-cineplex";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const validation = validateShowtimeQuery(
    request.nextUrl.searchParams.get("movie"),
    request.nextUrl.searchParams.get("date"),
  );
  if (!validation.valid) {
    return NextResponse.json({ state: "invalid_request", message: validation.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const { movie, date } = validation.value;

  try {
    const cacheKey = `star-cineplex:showtimes:${movie.toLocaleLowerCase("en")}:${date}`;
    const cached = await showtimeCache.get(cacheKey, () => starCineplexProvider.getShowtimes(movie, date), (result) => result.state === "available");
    const result = withStaleMetadata(cached.value, cached.stale);
    const status = result.state === "available" ? 200 : result.state === "unavailable" ? 503 : 502;
    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": result.state === "available" ? "public, s-maxage=720, stale-while-revalidate=1800" : "no-store" },
    });
  } catch {
    return NextResponse.json({
      state: "provider_error",
      message: "Showtimes could not be retrieved from Star Cineplex.",
      source: { provider: "star-cineplex", sourceUrl: "https://starcineplex.com/showtimes", checkedAt: new Date().toISOString(), mode: "provider-feed" },
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

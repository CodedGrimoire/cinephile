import { NextResponse } from "next/server";
import { cacheable, movieListCache, withStaleMetadata } from "@/lib/cinemas/route-cache";
import { starCineplexProvider } from "@/lib/cinemas/star-cineplex";
import { STAR_CINEPLEX_CAPABILITIES } from "@/lib/cinemas/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cached = await movieListCache.get("star-cineplex:movies", () => starCineplexProvider.getMovies(), cacheable);
    const result = withStaleMetadata(cached.value, cached.stale);
    const status = result.state === "available" ? 200 : result.state === "unavailable" ? 503 : 502;
    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": result.state === "available" ? "public, s-maxage=720, stale-while-revalidate=1800" : "no-store" },
    });
  } catch {
    return NextResponse.json({
      state: "provider_error",
      availabilityState: "provider_unavailable",
      capability: "catalogue",
      capabilities: STAR_CINEPLEX_CAPABILITIES,
      freshness: "not_retrieved",
      matchConfidence: "not_applicable",
      message: "Movie listings could not be retrieved from Star Cineplex.",
      source: { provider: "star-cineplex", sourceUrl: "https://api.kichole.com/catalog/api/movies", checkedAt: new Date().toISOString(), mode: "provider-feed" },
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

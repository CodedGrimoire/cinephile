import { NextResponse } from "next/server";
import { cacheable, movieListCache, withStaleMetadata } from "@/lib/cinemas/route-cache";
import { starCineplexProvider } from "@/lib/cinemas/star-cineplex";

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
      message: "Movie listings could not be retrieved from Star Cineplex.",
      source: { provider: "star-cineplex", sourceUrl: "https://starcineplex.com/movies?status=now-showing", checkedAt: new Date().toISOString(), mode: "provider-feed" },
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

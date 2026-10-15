import { NextResponse } from "next/server";
import { starCineplexProvider } from "@/lib/cinemas/star-cineplex";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await starCineplexProvider.getLocations();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json({
      state: "provider_error",
      message: "Cinema locations could not be loaded.",
      source: { provider: "star-cineplex", sourceUrl: "https://starcineplex.com/branches", checkedAt: new Date().toISOString(), mode: "official-public-directory" },
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

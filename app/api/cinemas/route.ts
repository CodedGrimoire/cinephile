import { NextResponse } from "next/server";
import { starCineplexProvider } from "@/lib/cinemas/star-cineplex";
import { STAR_CINEPLEX_CAPABILITIES } from "@/lib/cinemas/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await starCineplexProvider.getLocations();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({
      state: "provider_error",
      availabilityState: "provider_unavailable",
      capability: "branches",
      capabilities: STAR_CINEPLEX_CAPABILITIES,
      freshness: "not_retrieved",
      matchConfidence: "not_applicable",
      message: "Cinema locations could not be loaded.",
      source: { provider: "star-cineplex", sourceUrl: "https://starcineplex.com/branches", checkedAt: new Date().toISOString(), mode: "official-public-directory" },
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

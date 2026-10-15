import { GET as getShowtimes } from "../cinemas/showtimes/route";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Keep the existing cinema API intact while exposing the same data under a
// short route that is less likely to be filtered by browser privacy rules.
export function GET(request: NextRequest) {
  return getShowtimes(request);
}

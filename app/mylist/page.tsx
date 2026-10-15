import MyListClient from "./MyListClient";
import { getCachedDailySchedule } from "@/lib/cinemas/schedule-service";
import { dhakaDate } from "@/lib/cinemas/calendar";
import type { CinemaClientResult, ShowtimeListing } from "@/lib/cinemas/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MyListPage() {
  const date = dhakaDate();
  let initialSchedule: CinemaClientResult<ShowtimeListing>;

  try {
    const schedule = await getCachedDailySchedule(date);
    initialSchedule = schedule.state === "available"
      ? { state: "success", data: schedule.data, source: schedule.source }
      : {
          state: schedule.state,
          message: schedule.message,
          sourceUrl: schedule.source.sourceUrl,
        };
  } catch {
    initialSchedule = {
      state: "unavailable",
      message: "Cinephile could not load the Star Cineplex schedule.",
      sourceUrl: "https://api.kichole.com/inventory/api/shows",
    };
  }

  return <MyListClient initialDate={date} initialSchedule={initialSchedule} />;
}

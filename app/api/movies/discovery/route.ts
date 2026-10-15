import { NextResponse } from "next/server";

type TmdbMovie = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
};

type TmdbResponse = { results: TmdbMovie[] };

function dhakaDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function dateString({ year, month, day }: { year: number; month: number; day: number }): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextDay(date: { year: number; month: number; day: number }) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function mapMovie(movie: TmdbMovie) {
  const year = movie.release_date.slice(0, 4);
  return {
    Title: movie.title,
    Year: year || "N/A",
    // TMDB's stable ID is carried separately; this prefix is an internal wishlist key,
    // not an IMDb ID. The cinema matcher ignores it and falls back to exact title/year.
    imdbID: `tmdb-${movie.id}`,
    tmdbId: movie.id,
    Type: "movie",
    Poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : "N/A",
    Plot: movie.overview,
    ReleaseDate: movie.release_date,
    imdbRating: Number.isFinite(movie.vote_average) ? movie.vote_average.toFixed(1) : undefined,
    ratingLabel: "TMDB",
  };
}

async function discoverMovies(
  token: string,
  apiKey: string,
  startDate: string,
  endDate: string,
  sortBy: string,
): Promise<TmdbMovie[]> {
  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("include_video", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("region", "BD");
  url.searchParams.set("release_date.gte", startDate);
  url.searchParams.set("release_date.lte", endDate);
  url.searchParams.set("sort_by", sortBy);
  if (apiKey) url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: 1800 },
  });

  if (!response.ok) throw new Error(`TMDB discovery returned HTTP ${response.status}`);
  const data = (await response.json()) as Partial<TmdbResponse>;
  if (!Array.isArray(data.results)) throw new Error("TMDB discovery returned an invalid response");

  return data.results.filter((movie): movie is TmdbMovie =>
    typeof movie.id === "number" &&
    typeof movie.title === "string" &&
    typeof movie.release_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(movie.release_date) &&
    (movie.poster_path === null || typeof movie.poster_path === "string") &&
    typeof movie.overview === "string" &&
    typeof movie.vote_average === "number"
  );
}

export async function GET() {
  const token =
    process.env.TMDB_API_READ_ACCESS_TOKEN ??
    process.env.TMDB_ACCESS_TOKEN ??
    process.env.TMDB_BEARER_TOKEN ??
    "";
  const apiKey = process.env.TMDB_API_KEY ?? "";
  if (!token && !apiKey) {
    return NextResponse.json(
      {
        error:
          "TMDB is not configured. Add TMDB_API_READ_ACCESS_TOKEN, TMDB_ACCESS_TOKEN, TMDB_BEARER_TOKEN, or TMDB_API_KEY to the server environment.",
      },
      { status: 503 },
    );
  }

  const todayParts = dhakaDateParts(new Date());
  const today = dateString(todayParts);
  const tomorrow = dateString(nextDay(todayParts));
  const upcomingEnd = `${todayParts.year + 2}-12-31`;

  try {
    const [released, upcoming] = await Promise.all([
      discoverMovies(token, apiKey, `${todayParts.year}-01-01`, today, "popularity.desc"),
      discoverMovies(token, apiKey, tomorrow, upcomingEnd, "primary_release_date.asc"),
    ]);

    return NextResponse.json({
      year: todayParts.year,
      updatedAt: new Date().toISOString(),
      releasedThisYear: released.slice(0, 20).map(mapMovie),
      upcoming: upcoming.slice(0, 20).map(mapMovie),
    });
  } catch (error) {
    console.error("TMDB movie discovery failed:", error);
    return NextResponse.json({ error: "Could not load current movie releases." }, { status: 502 });
  }
}

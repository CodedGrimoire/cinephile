export type ShowtimeQuery = { movie: string; date: string };
export type ShowtimeQueryValidation = { valid: true; value: ShowtimeQuery } | { valid: false; message: string };

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateShowtimeQuery(movieValue: string | null, dateValue: string | null): ShowtimeQueryValidation {
  const movie = movieValue?.trim();
  const date = dateValue?.trim();
  if (!movie || movie.length < 2 || movie.length > 160 || /[\u0000-\u001f]/.test(movie)) {
    return { valid: false, message: "movie is required and must be 2–160 printable characters." };
  }
  if (!date || !validDate(date)) {
    return { valid: false, message: "date is required and must be a real date in YYYY-MM-DD format." };
  }
  return { valid: true, value: { movie, date } };
}

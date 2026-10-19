/** Display a recorded calendar date, including the date portion of API timestamps. */
export function dateLabel(value: string | null | undefined) {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
  if (!match) return "Not recorded";
  const date = new Date(`${match[1]}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1])
    return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

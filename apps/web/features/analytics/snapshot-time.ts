/** Snapshot timestamps use the clinic's calendar, unlike recorded date-only fields. */
export function snapshotTime(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  const day = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone }).format(date);
  const time = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
  return `${day} · ${time}`;
}

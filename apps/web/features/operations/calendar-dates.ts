export function shiftDay(value: string, offset: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function weekStart(value: string) {
  const weekday = new Date(`${value}T12:00:00Z`).getUTCDay();
  return shiftDay(value, -((weekday + 6) % 7));
}

export function calendarDay(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date(value));
}

export function minutes(value: string, zone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return (
    Number(parts.find((part) => part.type === "hour")?.value) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value)
  );
}

export function timeLabel(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}
export function monthDays(value: string) {
  const first = weekStart(monthStart(value));
  return Array.from({ length: 42 }, (_, index) => shiftDay(first, index));
}
export function shiftMonth(value: string, amount: number) {
  const date = new Date(`${monthStart(value)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}
export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart(value)}T12:00:00Z`));
}

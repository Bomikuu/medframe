import type { OperationsSetup } from "./schema";

/** Same precedence for the weekly grid and narrow day list: any closure wins. */
export function scheduleHours(setup: OperationsSetup, providerId: string, day: string) {
  const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  const overrides = setup.overrides.filter(
    (row) => row.date === day && (row.provider_id === providerId || !row.provider_id),
  );
  const closed = overrides.some((row) => row.closed);
  const own = overrides.filter((row) => row.provider_id === providerId);
  const chosen = own.length ? own : overrides;
  const windows = closed
    ? []
    : chosen.length
      ? chosen
      : setup.schedules.filter(
          (row) =>
            row.provider_id === providerId &&
            row.weekday === weekday &&
            row.active &&
            row.effective_from <= day &&
            row.effective_to >= day,
        );
  return { closed, overridden: chosen.length > 0, windows };
}

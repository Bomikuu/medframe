"use client";
import { useEffect, useState } from "react";
export function ClinicClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  return (
    <div className="shrink-0 text-left sm:text-right" aria-label="Current clinic time">
      <time
        dateTime={now?.toISOString()}
        className="block font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl"
      >
        {now
          ? new Intl.DateTimeFormat(undefined, {
              timeZone: timezone,
              hour: "numeric",
              minute: "2-digit",
            }).format(now)
          : "—:—"}
      </time>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {now
          ? new Intl.DateTimeFormat(undefined, {
              timeZone: timezone,
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(now)
          : "Clinic time"}
        <span className="ml-2">{timezone.replaceAll("_", " ")}</span>
      </p>
    </div>
  );
}

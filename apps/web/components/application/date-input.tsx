"use client";

import type { ComponentProps } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export function writtenDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Choose a date";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Choose a date";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Keep native calendar/keyboard semantics and ISO values; display a written date. */
export function DateInput({
  value,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "type"> & { value: string }) {
  return (
    <div
      className={cn(
        "relative flex h-11 min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        props.disabled && "opacity-50",
        className,
      )}
    >
      <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span aria-hidden className="truncate">
        {writtenDate(value)}
      </span>
      <input
        {...props}
        type="date"
        value={value}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented && typeof event.currentTarget.showPicker === "function") {
            try {
              event.currentTarget.showPicker();
            } catch {
              /* Native keyboard entry remains available. */
            }
          }
        }}
      />
    </div>
  );
}

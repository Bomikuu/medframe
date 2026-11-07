"use client";

import { Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonIdentity } from "@/components/application/person-identity";
import { dayLabel } from "./calendar-dates";
import { scheduleHours } from "./schedule-hours";
import type { OperationsSetup } from "./schema";

export function ScheduleDay({
  setup,
  day,
  add,
  viewWindows,
}: {
  setup: OperationsSetup;
  day: string;
  add?: (providerId: string) => void;
  viewWindows?: (providerId: string) => void;
}) {
  return (
    <section aria-label={`Provider hours for ${dayLabel(day)}`} className="px-5 pb-5 lg:hidden">
      <h3 className="py-4 text-sm font-semibold">{dayLabel(day)}</h3>
      <ul className="divide-y divide-border">
        {setup.providers.map((provider) => {
          const { closed, overridden, windows } = scheduleHours(setup, provider.id, day);
          return (
            <li key={provider.id} className="grid min-w-0 gap-3 py-4 first:pt-0">
              <PersonIdentity
                kind="provider"
                name={provider.name}
                imageId={provider.photo_id}
                className="text-sm font-semibold"
              />
              <div className="flex flex-wrap gap-2">
                {windows.length ? (
                  windows.map((window) => (
                    <span
                      key={window.id}
                      className="rounded-md bg-success-soft px-3 py-2 text-sm font-medium text-success tabular-nums"
                    >
                      {window.opens?.slice(0, 5)}–{window.closes?.slice(0, 5)}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {closed ? "Closed on this date" : "No working hours set"}
                  </p>
                )}
              </div>
              {overridden && (
                <p className="text-xs text-muted-foreground">
                  Date override · replaces regular weekly hours
                </p>
              )}
              {(add || viewWindows) && (
                <div className="flex flex-wrap gap-2">
                  {add && (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => add(provider.id)}
                      aria-label={`Add availability for ${provider.name}`}
                    >
                      <Plus aria-hidden className="size-4" />
                      Add availability
                    </Button>
                  )}
                  {viewWindows && (
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      onClick={() => viewWindows(provider.id)}
                      aria-label={`View saved windows for ${provider.name}`}
                    >
                      <List aria-hidden className="size-4" />
                      Saved windows
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

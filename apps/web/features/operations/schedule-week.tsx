"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal, Plus, List } from "lucide-react";
import { DateInput, writtenDate } from "@/components/application/date-input";
import { StaffAvatar } from "@/features/staff/staff-photo";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dayLabel, shiftDay, weekStart } from "./calendar-dates";
import { localDate, type OperationsSetup } from "./schema";
import { ScheduleSection } from "./schedule-section";
import { ScheduleDay } from "./schedule-day";
import { scheduleHours } from "./schedule-hours";

function datePart(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

export function ScheduleWeek({
  setup,
  add,
  viewWindows,
}: {
  setup: OperationsSetup;
  add?: (providerId: string) => void;
  viewWindows?: (providerId: string) => void;
}) {
  const [date, setDate] = useState(localDate(setup.timezone));
  const [picker, setPicker] = useState(false);
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(weekStart(date), index));
  const today = localDate(setup.timezone);
  return (
    <ScheduleSection
      id="weekly-availability"
      title="Weekly availability"
      icon={CalendarDays}
      description={`Provider working hours · ${setup.timezone}. Open the appointment calendar to check bookings.`}
      actions={
        <div className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2 sm:w-auto">
          <Button
            size="icon"
            variant="outline"
            aria-label="Previous week"
            onClick={() => setDate(shiftDay(date, -7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Popover open={picker} onOpenChange={setPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-0 gap-2 px-2 text-xs"
                aria-label={`Choose week, ${writtenDate(days[0])} to ${writtenDate(days[6])}`}
              >
                <CalendarDays className="size-4 shrink-0" />
                <span className="min-w-0 whitespace-normal">
                  {datePart(days[0], { month: "short", day: "numeric", year: "numeric" })} –{" "}
                  {datePart(days[6], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="grid w-72 gap-4">
              <label htmlFor="schedule-week" className="text-sm font-medium">
                Week containing
              </label>
              <DateInput
                id="schedule-week"
                value={date}
                onChange={(event) => {
                  if (event.target.value) {
                    setDate(event.target.value);
                    setPicker(false);
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  setDate(today);
                  setPicker(false);
                }}
              >
                This week
              </Button>
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            variant="outline"
            aria-label="Next week"
            onClick={() => setDate(shiftDay(date, 7))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      }
    >
      {!setup.providers.length ? (
        <p className="p-6 text-sm leading-6 text-muted-foreground">
          No permitted provider profiles in this branch. An administrator can add provider profiles
          in Staff & Access.
        </p>
      ) : (
        <>
          <div
            className="grid grid-cols-7 gap-1 px-4 pt-4 lg:hidden"
            role="group"
            aria-label="Choose schedule day"
          >
            {days.map((day) => (
              <Button
                key={day}
                variant={day === date ? "default" : "ghost"}
                aria-pressed={day === date}
                aria-label={dayLabel(day)}
                className="h-auto min-h-14 min-w-0 flex-col gap-1 px-0 text-xs"
                onClick={() => setDate(day)}
              >
                <span>{datePart(day, { weekday: "short" })}</span>
                <span className="font-semibold tabular-nums">{Number(day.slice(-2))}</span>
              </Button>
            ))}
          </div>
          <ScheduleDay setup={setup} day={date} add={add} viewWindows={viewWindows} />
          <div
            className="relative hidden overflow-x-auto px-3 pb-2 focus-visible:outline-2 focus-visible:outline-ring lg:block"
            tabIndex={0}
            role="region"
            aria-label="Weekly provider schedule, scroll to see all days"
          >
            <table className="w-full min-w-[960px] border-collapse text-left text-xs">
              <caption className="sr-only">
                Provider working hours for {dayLabel(days[0])} to {dayLabel(days[6])}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="w-56 border-b border-border px-3 py-4 font-semibold">
                    Provider
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      scope="col"
                      className="min-w-24 border-b border-l border-border/60 px-2 py-3 text-center font-medium"
                    >
                      <span className={day === today ? "text-teal-ink" : ""}>
                        {datePart(day, { weekday: "short" })}
                      </span>
                      <span className="mt-1 block font-normal text-muted-foreground">
                        {datePart(day, { month: "short", day: "numeric" })}
                      </span>
                    </th>
                  ))}
                  {add && (
                    <th scope="col" className="w-14 border-b border-border px-2">
                      <span className="sr-only">Provider actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {setup.providers.map((provider) => (
                  <tr key={provider.id} className="border-b border-border/70 last:border-0">
                    <th scope="row" className="px-3 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <StaffAvatar
                          name={provider.name}
                          photoId={provider.photo_id}
                          className="size-9 text-xs"
                        />
                        <span className="max-w-44 leading-5 break-words">{provider.name}</span>
                      </div>
                    </th>
                    {days.map((day) => {
                      const { closed, overridden, windows } = scheduleHours(
                        setup,
                        provider.id,
                        day,
                      );
                      return (
                        <td
                          key={day}
                          className="border-l border-border/40 px-1.5 py-3 align-middle"
                        >
                          <div className="grid gap-1">
                            {windows.length ? (
                              windows.map((window) => (
                                <span
                                  key={window.id}
                                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-teal-soft/70 px-2 py-2 whitespace-nowrap text-teal-ink tabular-nums"
                                >
                                  <span
                                    aria-hidden
                                    className="size-1.5 shrink-0 rounded-full bg-current"
                                  />
                                  {window.opens?.slice(0, 5)}–{window.closes?.slice(0, 5)}
                                  {overridden && <span className="sr-only"> date override</span>}
                                </span>
                              ))
                            ) : (
                              <span className="flex min-h-10 items-center justify-center rounded-md bg-muted/50 px-2 text-[11px] text-muted-foreground">
                                {closed ? "Closed" : "No hours"}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    {add && (
                      <td className="px-2 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label={`Schedule actions for ${provider.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onSelect={() => add(provider.id)}>
                              <Plus className="size-4" />
                              Add availability
                            </DropdownMenuItem>
                            {viewWindows && (
                              <DropdownMenuItem onSelect={() => viewWindows(provider.id)}>
                                <List className="size-4" />
                                View saved windows
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ScheduleSection>
  );
}

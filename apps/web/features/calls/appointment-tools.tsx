"use client";

import { Clock3, Info, MoreHorizontal, Plus, Settings2, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { callDate } from "./call-format";
import type { CallState } from "./client";

export function AppointmentTools({
  state,
  busy,
  extend,
  info,
  settings,
  help,
}: {
  state: CallState;
  busy: boolean;
  extend: (minutes: number) => void;
  info: () => void;
  settings: () => void;
  help: () => void;
}) {
  return (
    <>
      {state.role === "doctor" && state.timing_mode !== "instant" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" aria-label="Add appointment time">
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">Add time</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 aria-hidden className="size-4" />
              Add appointment time
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Availability is checked before the room’s end time changes.
            </p>
            <div className="mt-3 grid gap-2">
              {[5, 15].map((minutes) => (
                <Button
                  key={minutes}
                  variant="outline"
                  disabled={busy}
                  className="h-auto w-full flex-col items-start gap-1 py-3 text-left whitespace-normal"
                  onClick={() => extend(minutes)}
                >
                  <span>+{minutes} minutes</span>
                  <span className="max-w-full text-xs font-normal whitespace-normal">
                    Until{" "}
                    {callDate(
                      new Date(new Date(state.end).getTime() + minutes * 60000).toISOString(),
                      state.timezone,
                    )}
                  </span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="More appointment tools"
          >
            <MoreHorizontal aria-hidden className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={info}>
            <Info aria-hidden />
            Appointment information
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={settings}>
            <Settings2 aria-hidden />
            Check devices
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={help}>
            <CircleHelp aria-hidden />
            Help & privacy
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

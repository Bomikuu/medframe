"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeading } from "@/features/patients/feedback";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/features/patients/form-controls";

const sections = [
  ["weekly-availability", "Weekly availability"],
  ["saved-windows", "Saved windows"],
  ["schedule-resources", "Rooms and chairs"],
  ["date-overrides", "Date overrides"],
];

export function ScheduleLayout({
  calendarHref,
  addAvailability,
  children,
  manageable,
}: {
  calendarHref: string;
  addAvailability?: ReactNode;
  children: ReactNode;
  manageable: boolean;
}) {
  const [section, setSection] = useState("weekly-availability");
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        title="Provider schedules"
        description="Manage provider availability, working hours, and room schedules for your clinic."
      >
        <ButtonLink variant="outline" href={calendarHref}>
          <CalendarDays className="size-4" />
          Open appointment calendar
        </ButtonLink>
        {addAvailability}
      </PageHeading>
      {manageable && (
        <div className="md:hidden">
          <FormSelect
            id="schedule-section"
            label="Schedule section"
            value={section}
            options={sections.map(([value, label]) => ({ value, label }))}
            onChange={(value) => {
              setSection(value);
              document.getElementById(value)?.scrollIntoView({ block: "start" });
              document.getElementById(`${value}-title`)?.focus({ preventScroll: true });
            }}
          />
        </div>
      )}
      {manageable && (
        <nav
          aria-label="Schedule sections"
          className="hidden min-w-0 overflow-x-auto border-b border-border md:block"
        >
          <div className="flex w-max min-w-full gap-2">
            {sections.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={section === id ? "location" : undefined}
                onClick={() => setSection(id)}
                className={cn(
                  "min-h-11 shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                  section === id && "border-primary bg-card text-primary",
                )}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
      )}
      {children}
    </div>
  );
}

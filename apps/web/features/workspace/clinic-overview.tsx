"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChartNoAxesCombined, Search, Sun, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { PatientSearchDialog } from "@/features/patients/patient-search-dialog";
import { localDate } from "@/features/operations/schema";
import { dayLabel } from "@/features/operations/calendar-dates";
import { useWorkspace } from "./workspace-provider";
import { useUrlState } from "./use-url-state";
import { TodayWorkspace } from "./today-workspace";
import { SetupChecklist, useClinicSetup } from "./setup-checklist";

export function ClinicOverview() {
  const { workspace, overview, can, href, organizationId, branchId } = useWorkspace();
  const router = useRouter();
  const [tab, setTab] = useUrlState("dashboard", "today", ["today", "analytics"]);
  const [search, setSearch] = useState(false);
  const setup = useClinicSetup();
  const today = localDate(workspace.organization.timezone);
  const name = overview.currentUser.displayName
    .trim()
    .replace(/^(dr\.?|doctor)\s+/i, "")
    .split(/\s+/)[0];
  return (
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays aria-hidden className="size-4 text-teal-ink" />
            {dayLabel(today)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {name ? `Welcome back, ${name}` : "Your clinic dashboard"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your patients, today’s work, and what needs attention.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("patients.demographics.read") && (
            <Button variant="outline" onClick={() => setSearch(true)}>
              <Search aria-hidden className="size-4" />
              Find patient
            </Button>
          )}
          {can("patients.register") && (
            <ButtonLink href={href("/clinic/patients/new")}>
              <UserPlus aria-hidden className="size-4" />
              Register patient
            </ButtonLink>
          )}
        </div>
      </header>
      <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-5">
        <TabsList aria-label="Dashboard view" className="h-12 w-fit rounded-full bg-muted p-1">
          <TabsTrigger value="today" className="min-h-10 rounded-full px-5">
            <Sun aria-hidden className="size-4" />
            Today
          </TabsTrigger>
          <TabsTrigger value="analytics" className="min-h-10 rounded-full px-5">
            <ChartNoAxesCombined aria-hidden className="size-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          {tab === "today" && (
            <div className="grid min-w-0 gap-6">
              <TodayWorkspace key={`${organizationId}:${branchId}`} />
              {setup.state?.available && !setup.state.dismissed && (
                <details className="rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Finish setting up your clinic
                  </summary>
                  <div className="mt-4">
                    <SetupChecklist model={setup} />
                  </div>
                </details>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="analytics">{tab === "analytics" && <AnalyticsPage />}</TabsContent>
      </Tabs>
      <PatientSearchDialog
        open={search}
        onOpenChange={setSearch}
        branchId={branchId}
        select={(patient) => router.push(href(`/clinic/patients/${patient.id}`))}
      />
    </div>
  );
}

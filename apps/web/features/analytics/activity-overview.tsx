"use client";

import { useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import type { z } from "zod";
import { FormSelect } from "@/features/patients/form-controls";
import { PeriodComparisonChart } from "./period-comparison-chart";
import { type insightsSchema, type Metric } from "./schema";

type Insights = z.infer<typeof insightsSchema>;

function Change({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  return (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      {previous === 0
        ? "No previous-period data"
        : `${delta > 0 ? "+" : ""}${((delta / previous) * 100).toFixed(1)}%`}
      {" · "}
      {previous.toLocaleString()} previously
    </p>
  );
}

export function ActivityOverview({ data }: { data: Insights }) {
  const [activity, setActivity] = useState("appointments");
  const metrics: { key: string; title: string; value: Metric }[] = [];
  if (data.operations) {
    metrics.push({
      key: "appointments",
      title: "Scheduled bookings",
      value: data.operations.appointments,
    });
    metrics.push({
      key: "queue",
      title: "Consultation queue admissions",
      value: data.operations.queue,
    });
  }
  if (data.clinical)
    metrics.push({
      key: "consultations",
      title: "Consultations opened",
      value: data.clinical.encounters,
    });
  const selected = metrics.find((metric) => metric.key === activity) ?? metrics[0];
  const chart = (title: string, value: Metric) => (
    <PeriodComparisonChart
      key={`${data.branch_id}:${data.current_from}:${data.current_to}:${title}`}
      title={title}
      current={value.series.map((row) => ({ date: row.date, value: row.count }))}
      previous={value.previous_series.map((row) => ({ date: row.date, value: row.count }))}
      formatAxis={(value) => Math.round(value).toLocaleString("en-PH")}
    />
  );

  return (
    <section className="grid min-w-0 gap-6" aria-labelledby="dashboard-activity">
      <div className="flex items-start gap-3">
        <span className="text-info-ink grid size-10 shrink-0 place-items-center rounded-xl bg-info-soft">
          <CalendarDays className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="dashboard-activity" className="text-xl font-semibold">
            Bookings & patients
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            How your clinic is being used, compared with the previous equal period.
          </p>
        </div>
      </div>
      <dl className="grid gap-x-8 gap-y-6 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        {data.operations && (
          <div>
            <dt className="text-sm text-muted-foreground">Scheduled bookings</dt>
            <dd className="mt-3 text-3xl font-semibold tabular-nums">
              {data.operations.appointments.current.toLocaleString()}
            </dd>
            <Change {...data.operations.appointments} />
            <p className="mt-1 text-xs text-muted-foreground">
              {data.operations.appointments.distinct_current?.toLocaleString()} distinct scheduled
              patients
            </p>
          </div>
        )}
        {data.patients && (
          <>
            <div>
              <dt className="text-sm text-muted-foreground">Total patients</dt>
              <dd className="mt-3 text-3xl font-semibold tabular-nums">
                {data.patients.total.toLocaleString()}
              </dd>
              <dd className="mt-2 text-xs leading-5 text-muted-foreground">
                Accessible branch records · as of now
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">New patient records</dt>
              <dd className="mt-3 text-3xl font-semibold tabular-nums">
                {data.patients.registrations.current.toLocaleString()}
              </dd>
              <Change {...data.patients.registrations} />
            </div>
          </>
        )}
        {data.clinical && (
          <div>
            <dt className="text-sm text-muted-foreground">Consultations opened</dt>
            <dd className="mt-3 text-3xl font-semibold tabular-nums">
              {data.clinical.encounters.current.toLocaleString()}
            </dd>
            <Change {...data.clinical.encounters} />
          </div>
        )}
      </dl>
      <div className={`grid min-w-0 gap-5 ${selected && data.patients ? "xl:grid-cols-2" : ""}`}>
        {selected && (
          <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 max-w-xs">
              <FormSelect
                id="dashboard-activity-chart"
                label="Activity to compare"
                value={selected.key}
                onChange={setActivity}
                options={metrics.map((metric) => ({ value: metric.key, label: metric.title }))}
              />
            </div>
            {chart(selected.title, selected.value)}
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs">
              {selected.value.statuses.map((row) => (
                <div key={row.label} className="flex gap-2">
                  <dt className="text-muted-foreground capitalize">
                    {row.label.replaceAll("_", " ")}
                  </dt>
                  <dd className="font-medium tabular-nums">{row.count}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {data.patients && (
          <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex min-h-20 items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" aria-hidden />
              Patient registration trend
            </div>
            {chart("New patient records", data.patients.registrations)}
          </div>
        )}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Bookings use their scheduled date; registrations and consultations use their creation date.
        Queue admissions are separate from department visits. Statuses reflect their current state.
        Patient figures follow your live record access; they may differ from clinic-wide totals.
      </p>
    </section>
  );
}

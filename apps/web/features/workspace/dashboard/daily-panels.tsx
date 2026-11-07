"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellDot,
  CalendarClock,
  FilePenLine,
  FlaskConical,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonIdentity } from "@/components/application/person-identity";
import { StatusBadge } from "@/components/application/status-badge";
import { useWorkspace } from "../workspace-provider";
import { dateLabel } from "@/features/patients/calendar-date";
import { money } from "@/features/billing/analytics/schema";
import type { DailyData, DailyTask } from "./schema";
import { shortClock } from "./today-patients";

function clinicDay(value: string, zone: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date(value));
}

export function TaskRows({ items, zone }: { items: DailyTask[]; zone: string }) {
  const { href } = useWorkspace();
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={`${item.kind}:${item.id}`} className="py-4 first:pt-0 last:pb-0">
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium">
            <span
              className={item.overdue || item.urgent ? "text-warning" : "text-muted-foreground"}
            >
              {item.urgent
                ? "Urgent order · review results"
                : item.kind === "result"
                  ? "Results awaiting review"
                  : item.kind === "note"
                    ? "Unfinished documentation"
                    : item.overdue
                      ? "Overdue follow-up"
                      : "Follow-up today"}
            </span>
            <span className="text-muted-foreground">{dateLabel(clinicDay(item.at, zone))}</span>
          </div>
          <p className="line-clamp-2 text-sm leading-6 font-medium">{item.title}</p>
          <PersonIdentity
            kind="patient"
            name={item.patient}
            imageId={item.patient_portrait_id}
            className="mt-2 max-w-full text-xs"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">{item.responsible}</p>
          <Link
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-teal-ink hover:underline sm:min-h-8"
            href={
              item.kind === "note"
                ? href(`/clinic/consultations/${item.id}`)
                : item.kind === "result"
                  ? href(`/clinic/diagnostics/${item.id}`)
                  : `${href(`/clinic/patients/${item.patient_id}`)}&tab=treatments`
            }
          >
            {item.kind === "result"
              ? "Review result"
              : item.kind === "note"
                ? "Open consultation"
                : "Review follow-up"}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
          <span className="sr-only">Clinic timezone {zone}</span>
        </li>
      ))}
    </ul>
  );
}

export function AttentionPanel({ data, expand }: { data: DailyData; expand: () => void }) {
  return (
    <section
      className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="attention-title"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="attention-title" className="flex items-center gap-2 text-lg font-semibold">
          <BellDot aria-hidden className="size-5 text-warning" />
          Needs attention
        </h2>
        <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
          {data.attention.total}
        </span>
      </div>
      <p className="mb-5 text-xs leading-5 text-muted-foreground">
        Unfinished work, including earlier visits. Recorded urgent results and overdue follow-ups
        appear first.
      </p>
      {data.attention.items.length ? (
        <TaskRows items={data.attention.items.slice(0, 3)} zone={data.timezone} />
      ) : (
        <p className="rounded-lg bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
          No unfinished notes, due follow-ups or results awaiting review in your permitted records.
        </p>
      )}
      {data.attention.total > 0 && (
        <Button className="mt-4 w-full" variant="outline" size="sm" onClick={expand}>
          Review all {data.attention.total} tasks
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      )}
    </section>
  );
}

export function UnfinishedWork({ data }: { data: DailyData }) {
  const { href, can } = useWorkspace();
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <FilePenLine aria-hidden className="size-5 text-teal-ink" />
        Continue documentation
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Your permitted unfinished consultations, oldest update first.
      </p>
      {data.attention.unfinished.length ? (
        <ul className="mt-5 divide-y divide-border">
          {data.attention.unfinished.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <PersonIdentity
                  kind="patient"
                  name={item.patient}
                  imageId={item.patient_portrait_id}
                  className="max-w-full text-sm font-semibold"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge value={item.status} />
                  <time dateTime={item.at}>{dateLabel(clinicDay(item.at, data.timezone))}</time>
                </div>
                <PersonIdentity
                  kind="provider"
                  name={item.provider}
                  imageId={item.provider_photo_id}
                  className="mt-2 max-w-full text-xs text-muted-foreground"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.specialty === "dentistry" && (
                  <Link
                    href={`${href(`/clinic/patients/${item.patient_id}`)}&tab=dental`}
                    className="inline-flex min-h-11 items-center px-3 text-xs font-semibold text-teal-ink hover:underline"
                  >
                    Dental chart
                  </Link>
                )}
                <Link
                  href={href(`/clinic/consultations/${item.id}`)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-teal-soft px-3 text-xs font-semibold text-teal-ink hover:bg-muted"
                >
                  {can("encounters.write") && item.mine ? "Resume" : "View consultation"}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          No unfinished consultations to continue.
        </p>
      )}
    </section>
  );
}

export function ProviderHours({ data }: { data: DailyData }) {
  const { href } = useWorkspace();
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Stethoscope aria-hidden className="size-5 text-teal-ink" />
          Provider hours
        </h2>
        <Link
          href={href("/clinic/settings/schedules")}
          className="text-xs font-semibold text-teal-ink hover:underline"
        >
          Schedules
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Recorded availability for today</p>
      {data.providers.length ? (
        <ul className="mt-5 divide-y divide-border">
          {data.providers.slice(0, 4).map((item) => (
            <li key={item.provider_id} className="py-3 first:pt-0 last:pb-0">
              <PersonIdentity
                kind="provider"
                name={item.provider}
                imageId={item.provider_photo_id}
                className="max-w-full text-sm font-semibold"
              />
              <p className="mt-2 text-xs text-muted-foreground capitalize">
                {item.specialty.replaceAll("_", " ")}
              </p>
              {item.hours.map((hours, index) => (
                <p key={index} className="mt-1 text-xs tabular-nums">
                  {shortClock(hours.opens, data.timezone)} to{" "}
                  {shortClock(hours.closes, data.timezone)}
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
          No provider hours to show here. Open Schedules to review availability.
        </p>
      )}
    </section>
  );
}

export function FollowUpWork({ data }: { data: DailyData }) {
  const { href } = useWorkspace();
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarClock aria-hidden className="size-5 text-teal-ink" />
        Follow-ups & diagnostic work
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {data.attention.totals.follow_ups} follow-ups due or overdue.{" "}
        {data.attention.totals.results} results awaiting review.
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Due follow-ups and reviewable results are included in Needs attention above.
      </p>
      {data.attention.orders.length > 0 && (
        <>
          <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold">
            <FlaskConical aria-hidden className="size-4" />
            Orders awaiting results
          </h3>
          <ul className="mt-3 divide-y divide-border">
            {data.attention.orders.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <PersonIdentity
                    kind="patient"
                    name={item.patient}
                    imageId={item.patient_portrait_id}
                    className="max-w-full text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.title}
                    <span className="mx-2">/</span>
                    {item.status.replaceAll("_", " ")}
                  </p>
                </div>
                <Link
                  href={href(`/clinic/diagnostics/${item.id}`)}
                  className="text-xs font-semibold text-teal-ink hover:underline"
                >
                  View order
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.attention.totals.orders} outstanding orders in total.
          </p>
        </>
      )}
    </section>
  );
}

export function DailyFinance({ data }: { data: DailyData }) {
  const { href } = useWorkspace();
  if (!data.finance) return null;
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Wallet aria-hidden className="size-5 text-teal-ink" />
          Financial snapshot
        </h2>
        <Link
          href={href("/clinic/billing")}
          className="text-xs font-semibold text-teal-ink hover:underline"
        >
          Open billing
          <ArrowRight aria-hidden className="ml-1 inline size-3.5" />
        </Link>
      </div>
      {data.finance.map((item) => (
        <dl key={item.currency} className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Recorded payments today",
              value: item.collected,
              detail: "Gross payments by payment date",
            },
            {
              label: "Current outstanding",
              value: item.outstanding,
              detail: "All issued unpaid obligations",
            },
            {
              label: "Overdue balance",
              value: item.overdue,
              detail: "Past-due obligations as of now",
            },
          ].map((metric) => (
            <Link
              key={metric.label}
              href={`${href("/clinic/billing")}${metric.label === "Current outstanding" ? "&balance=outstanding&status=issued" : metric.label === "Overdue balance" ? "&balance=overdue&status=issued" : ""}`}
              className="rounded-lg bg-muted/40 p-4 transition-colors hover:bg-teal-soft/50"
            >
              <dt className="text-xs text-muted-foreground">{metric.label}</dt>
              <dd className="mt-2 text-xl font-semibold tabular-nums">
                {money(metric.value, item.currency)}
              </dd>
              <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                {metric.detail}
              </span>
            </Link>
          ))}
        </dl>
      ))}
    </section>
  );
}

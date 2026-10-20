import { dateLabel } from "@/features/patients/feedback";

import { snapshotTime } from "./snapshot-time";

type Period = {
  current_from: string;
  current_to: string;
  previous_from: string;
  previous_to: string;
  as_of: string;
  timezone: string;
};
export function ReportPeriodContext({ period }: { period: Period }) {
  return (
    <section
      aria-label="Report period and snapshot"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="text-base font-semibold">How to read this report</h2>
      <dl className="mt-4 grid gap-5 text-sm lg:grid-cols-3">
        <div>
          <dt className="font-medium">Selected activity period</dt>
          <dd className="mt-1 leading-6 text-muted-foreground">
            {dateLabel(period.current_from)} – {dateLabel(period.current_to)}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Previous equal period</dt>
          <dd className="mt-1 leading-6 text-muted-foreground">
            {dateLabel(period.previous_from)} – {dateLabel(period.previous_to)}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Report retrieved</dt>
          <dd className="mt-1 leading-6 text-muted-foreground">
            {snapshotTime(period.as_of, period.timezone)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
        Completed clinic days in {period.timezone}; today is excluded from activity comparisons.
        Status counts reflect the records’ current state. Financial balances are a separate current
        snapshot and may include activity after the selected period.
      </p>
    </section>
  );
}

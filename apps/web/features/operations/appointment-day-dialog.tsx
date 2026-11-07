"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingInformation } from "@/components/application/loading-information";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { OperationAppointmentsDocument } from "@/lib/graphql/generated";
import { AppointmentDayList } from "./appointment-day-list";
import { AppointmentDetails } from "./appointment-details";
import { appointmentPageSchema, type Appointment, type OperationsSetup } from "./schema";
import { OperationsRefresh } from "./controls";

export function AppointmentDayDialog({
  day,
  count,
  setup,
  provider,
  status,
  close,
  edit,
}: {
  day: string;
  count?: number;
  setup: OperationsSetup;
  provider: string;
  status: string;
  close: () => void;
  edit: (row: Appointment) => void;
}) {
  const { organizationId } = useWorkspace();
  const [after, setAfter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const remote = useRemote(
    OperationAppointmentsDocument,
    {
      organizationId,
      filters: {
        branch_id: setup.branch_id,
        date: day,
        date_to: day,
        calendar: true,
        calendar_mode: "day",
        ...(provider !== "all" ? { provider_id: provider } : {}),
        ...(status !== "all" ? { status } : {}),
      },
      after,
    },
    { refreshOnFocus: false },
  );
  const parsed = appointmentPageSchema.safeParse(remote.data?.appointments);
  const row = parsed.success ? parsed.data.items.find((item) => item.id === selected) : undefined;
  if (row)
    return (
      <AppointmentDetails
        row={row}
        current={parsed.success ? (parsed.data.calendar?.in_service ?? []) : []}
        setup={setup}
        reload={remote.reload}
        close={() => setSelected(null)}
        backLabel="Back to day appointments"
        reschedule={() => edit(row)}
        stale={remote.loading || !!remote.error}
      />
    );
  return (
    <AppointmentDayList
      day={day}
      timezone={setup.timezone}
      count={count}
      items={parsed.success ? parsed.data.items : []}
      close={close}
      select={(item) => setSelected(item.id)}
      stale={remote.loading || !!remote.error}
      notice={
        !parsed.success ? (
          <div className="grid min-h-64 place-items-center py-6">
            {remote.error ? (
              <LoadState error={remote.error} retry={remote.reload} />
            ) : (
              <LoadingInformation
                title="Loading day appointments"
                detail="Retrieving bookings matching the selected date, clinic and calendar filters."
              />
            )}
          </div>
        ) : remote.error ? (
          <RemoteNotice error={remote.error} retry={remote.reload} />
        ) : null
      }
      footer={
        parsed.success && (
          <div className="flex flex-wrap items-center gap-2">
            <OperationsRefresh refresh={remote.reload} busy={remote.loading} />
            {after && (
              <Button variant="outline" disabled={remote.loading} onClick={() => setAfter(null)}>
                First bookings
              </Button>
            )}
            {parsed.data.has_next_page && (
              <Button
                variant="outline"
                disabled={remote.loading}
                onClick={() => setAfter(parsed.data.end_cursor)}
              >
                More bookings
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              {parsed.data.items.length} shown{parsed.data.has_next_page ? " on this page" : ""}
            </span>
          </div>
        )
      }
    />
  );
}

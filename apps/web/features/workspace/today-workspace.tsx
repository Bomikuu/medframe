"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LoadState, RemoteNotice } from "@/features/patients/feedback";
import { useWorkspace } from "./workspace-provider";
import { DailySummary } from "./dashboard/daily-summary";
import { TodayPatients, shortClock } from "./dashboard/today-patients";
import {
  AttentionPanel,
  UnfinishedWork,
  ProviderHours,
  FollowUpWork,
  DailyFinance,
  TaskRows,
} from "./dashboard/daily-panels";
import { useDailyWork } from "./dashboard/use-daily-work";
import type { VisitFilter } from "./dashboard/schema";

const DailyAppointment = dynamic(() =>
  import("./dashboard/daily-appointment").then((module) => module.DailyAppointment),
);

export function TodayWorkspace() {
  const { organizationId, branchId } = useWorkspace();
  return <DailyWorkspace key={`${organizationId}:${branchId}`} />;
}
function DailyWorkspace() {
  const [booking, setBooking] = useState<{ id: string; patientId: string } | null>(null);
  const openAppointment = (id: string, patientId: string) => {
    setDialog(null);
    setBooking({ id, patientId });
  };
  const [filter, setFilter] = useState<VisitFilter>("all");
  const [page, setPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const [dialog, setDialog] = useState<"patients" | "attention" | null>(null);
  const remote = useDailyWork(filter, page, taskPage);
  const data = remote.data;
  const select = (next: VisitFilter) => {
    setFilter(next);
    setPage(1);
  };
  return (
    <div className="grid min-w-0 gap-5" aria-busy={remote.loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {data
            ? `Updated ${shortClock(data.updated_at, data.timezone)} · ${data.timezone}`
            : "Loading your permitted daily work"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-disabled={remote.loading}
          onClick={() => {
            if (!remote.loading) remote.reload();
          }}
        >
          <RefreshCw aria-hidden className="size-4" />
          {remote.loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {data && <RemoteNotice error={remote.error} retry={remote.reload} />}
      {remote.updating && (
        <p role="status" className="text-xs text-muted-foreground">
          Updating your view. Previous results remain visible until the latest information is ready.
        </p>
      )}
      {!data ? (
        <LoadState
          error={remote.error}
          retry={remote.reload}
          title="Preparing today’s clinic"
          detail="Checking your permitted visits, unfinished work and current balances."
        />
      ) : (
        <>
          <DailySummary
            data={data}
            filter={filter}
            select={select}
            attention={() => {
              setTaskPage(1);
              setDialog("attention");
            }}
          />
          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
            <div className="grid min-w-0 gap-5">
              {(data.operations || data.clinical) && (
                <TodayPatients
                  data={data}
                  appointment={openAppointment}
                  filter={filter}
                  select={select}
                  page={page}
                  setPage={setPage}
                  expand={() => {
                    setPage(1);
                    setDialog("patients");
                  }}
                />
              )}
              {data.clinical && (
                <div className="hidden xl:block">
                  <UnfinishedWork data={data} />
                </div>
              )}
            </div>
            <div className="grid min-w-0 gap-5">
              {data.clinical && (
                <AttentionPanel
                  data={data}
                  expand={() => {
                    setTaskPage(1);
                    setDialog("attention");
                  }}
                />
              )}
              {data.operations && (
                <div className="hidden xl:block">
                  <ProviderHours data={data} />
                </div>
              )}
            </div>
          </div>
          {data.clinical && (
            <div className="xl:hidden">
              <UnfinishedWork data={data} />
            </div>
          )}
          {data.clinical && <FollowUpWork data={data} />}
          {data.operations && (
            <div className="xl:hidden">
              <ProviderHours data={data} />
            </div>
          )}
          <DailyFinance data={data} />
        </>
      )}
      {booking && data && (
        <DailyAppointment
          id={booking.id}
          patientId={booking.patientId}
          day={data.date}
          close={() => setBooking(null)}
          updated={remote.reload}
        />
      )}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setPage(1);
            setTaskPage(1);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
          <DialogTitle>
            {dialog === "patients" ? "Today’s patient visits" : "Work requiring attention"}
          </DialogTitle>
          <DialogDescription>
            {dialog === "patients"
              ? "Bookings, queue entries and consultations are joined only where an explicit link exists."
              : "All permitted unfinished notes, follow-ups due or overdue, and results awaiting review. Includes earlier visits."}
          </DialogDescription>
          {!data ? (
            <LoadState error={remote.error} retry={remote.reload} />
          ) : dialog === "patients" ? (
            <TodayPatients
              data={data}
              appointment={openAppointment}
              filter={filter}
              select={select}
              page={page}
              setPage={setPage}
              expanded
            />
          ) : (
            <>
              <TaskRows items={data.attention.items} zone={data.timezone} />
              {!data.attention.total && (
                <p className="py-5 text-sm text-muted-foreground">No work requiring attention.</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                <span>
                  Page {taskPage} · {data.attention.total} tasks
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={taskPage <= 1}
                    onClick={() => setTaskPage(taskPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={taskPage * 8 >= data.attention.total}
                    onClick={() => setTaskPage(taskPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

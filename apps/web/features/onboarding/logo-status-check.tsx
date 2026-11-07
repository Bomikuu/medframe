"use client";

import { useEffect, useState } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Snapshot } from "./schema";

const delays = [3000, 6000, 12000, 20000, 30000, 30000];

/** Only pending logos poll; each user-requested cycle is serialized and bounded. */
export function LogoStatusCheck({
  logo,
  reload,
}: {
  logo: Snapshot["logo"];
  reload: () => Promise<Snapshot>;
}) {
  const [cycle, setCycle] = useState(0);
  const [state, setState] = useState<{
    id: string;
    stopped: boolean;
    failed: boolean;
    busy: boolean;
  } | null>(null);
  const id = logo?.id;
  const status = logo?.state;
  useEffect(() => {
    if (!id || status !== "pending") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    setState({ id, stopped: false, failed: false, busy: false });
    const check = async () => {
      attempt++;
      try {
        const result = await reload();
        if (!active || result.logo?.id !== id || result.logo.state !== "pending") return;
        if (attempt < delays.length) timer = setTimeout(check, delays[attempt]);
        else setState({ id, stopped: true, failed: false, busy: false });
      } catch {
        if (!active) return;
        if (attempt < delays.length) timer = setTimeout(check, delays[attempt]);
        else setState({ id, stopped: true, failed: true, busy: false });
      }
    };
    timer = setTimeout(check, delays[0]);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, status, cycle, reload]);
  if (!logo || ["clean"].includes(logo.state)) return null;
  const current = state?.id === logo.id ? state : null;
  const paused = logo.state !== "pending" || current?.stopped;
  return (
    <section
      aria-label="Clinic logo status"
      className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm"
    >
      <div className="flex max-w-2xl gap-2">
        <ImageIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-ink" />
        <div>
          <p className="font-medium">
            {logo.state === "unavailable"
              ? "Logo check unavailable"
              : logo.state === "pending"
                ? paused
                  ? "Logo is still being checked"
                  : "Checking your clinic logo"
                : "Logo needs attention"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {logo.state === "pending"
              ? paused
                ? "Automatic checks have paused. Your clinic details are saved; check again when ready."
                : "Checking a few times with increasing intervals. Your form stays available while the image is reviewed."
              : "The image cannot be used until its security check clears. Check again, or replace/remove it in Branding. Your other setup details are retained."}
            {current?.failed ? " The last status request could not be completed." : ""}
          </p>
        </div>
      </div>
      {paused && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current?.busy}
          onClick={async () => {
            setState({ id: logo.id, stopped: true, failed: false, busy: true });
            try {
              const result = await reload();
              setState({ id: logo.id, stopped: true, failed: false, busy: false });
              if (result.logo?.state === "pending") setCycle((value) => value + 1);
            } catch {
              setState({ id: logo.id, stopped: true, failed: true, busy: false });
            }
          }}
        >
          <RefreshCw aria-hidden className="size-4" />
          {current?.busy ? "Checking…" : "Check logo again"}
        </Button>
      )}
    </section>
  );
}

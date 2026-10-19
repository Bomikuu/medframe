"use client";

import { useState } from "react";
import { ArrowRight, CheckCheck, ChevronDown, CirclePlus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Create device",
    description: "Choose its name, branch and functions.",
    icon: CirclePlus,
  },
  { title: "Pair device", description: "Enter its one-use code on the device.", icon: KeyRound },
  { title: "Approve access", description: "Compare the phrase, then approve.", icon: CheckCheck },
];

export function DeviceSetupGuide() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section
      aria-labelledby="device-setup-title"
      className="rounded-xl border border-border bg-card px-5 py-6 sm:px-6"
    >
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] xl:items-center">
        <div>
          <h2 id="device-setup-title" className="text-lg font-semibold">
            Connect your clinic devices
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            A one-use pairing code connects the device. You control its purpose and access.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            aria-expanded={expanded}
            aria-controls="device-setup-details"
            onClick={() => setExpanded(!expanded)}
          >
            How it works <ChevronDown className={expanded ? "rotate-180" : ""} />
          </Button>
        </div>
        <ol className="grid gap-5 sm:grid-cols-3 sm:gap-4">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <li key={title} className="relative flex items-start gap-3">
              <div className="bg-teal-wash flex size-10 shrink-0 items-center justify-center rounded-full text-teal-ink">
                <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm leading-5 font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight
                  className="absolute top-2.5 -right-3 hidden size-4 text-muted-foreground/60 sm:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
      <div
        id="device-setup-details"
        hidden={!expanded}
        className="mt-6 border-t border-border pt-5 text-sm leading-7 text-muted-foreground"
      >
        Add a device and save its settings. Open{" "}
        <strong className="font-medium text-foreground">Pairing code</strong> to generate or copy a
        private code, then enter it at <span className="font-medium text-foreground">/station</span>{" "}
        on the receiving device. Return to{" "}
        <strong className="font-medium text-foreground">Manage</strong>, refresh the connection and
        compare both verification phrases before approving. A clinician uses their own doctor access
        code afterward; a standard patient kiosk is opened by reception.
      </div>
    </section>
  );
}

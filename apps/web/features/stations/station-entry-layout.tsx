import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { MedframeScene } from "@/components/illustrations/medframe-scene";

function StationBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-72 -left-52 size-[33rem] rounded-full border border-sky-200/50 bg-sky-100/40 dark:opacity-10" />
      <div className="absolute -top-72 -left-64 size-[29rem] rounded-full bg-sky-100/50 dark:opacity-10" />
      <div className="absolute -bottom-80 -left-72 h-[40rem] w-[32rem] -rotate-25 rounded-full bg-teal-100/35 dark:opacity-10" />
      <div className="absolute -right-64 -bottom-64 size-[40rem] rounded-full bg-sky-100/40 dark:opacity-10" />
      <div className="absolute -right-44 -bottom-80 size-[36rem] rounded-full border border-cyan-200/60 dark:opacity-15" />
      <div className="absolute top-20 right-[7%] h-24 w-32 bg-[radial-gradient(circle,#c8e0f5_1.5px,transparent_1.5px)] [background-size:22px_22px] dark:opacity-15" />
      <div className="absolute top-[46%] -left-7 h-32 w-40 bg-[radial-gradient(circle,#c8e0f5_1.5px,transparent_1.5px)] [background-size:22px_22px] dark:opacity-15" />
    </div>
  );
}

export function StationEntryLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="relative isolate min-h-dvh bg-background">
      <StationBackdrop />
      <header className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <Brand />
        <span className="text-sm font-medium text-muted-foreground">Station</span>
      </header>
      <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl items-center gap-9 px-4 py-6 sm:px-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-9 md:py-8 lg:gap-14 lg:px-12 xl:gap-20">
        <section
          className="order-2 min-w-0 pb-6 md:order-1 md:pb-0"
          aria-labelledby="station-welcome-title"
        >
          <MedframeScene
            name="station-pin-pairing"
            className="mb-5 max-w-64 md:max-w-full"
            imageClassName="max-h-[32svh] md:max-h-[34svh]"
          />
          <h1
            id="station-welcome-title"
            className="text-3xl leading-[1.16] font-semibold tracking-tight text-primary lg:text-[clamp(2rem,3.1vw,2.8rem)]"
          >
            The right workspace.
            <span className="block text-teal-ink">On this device.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground lg:text-base">
            Connect a clinic tablet, kiosk or display. Your clinic chooses what it can do. A
            doctor’s temporary code opens their clinical workspace here.
          </p>
          <div className="mt-6 flex max-w-md items-start gap-3 text-xs leading-6 text-muted-foreground lg:mt-7 lg:text-sm">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-teal-ink" strokeWidth={1.6} />
            <p>
              Pairing never grants access to a patient record. Clinic approval and the appropriate
              identity are always required.
            </p>
          </div>
        </section>
        <section
          className="order-1 min-w-0 rounded-2xl border border-sky-100 bg-card p-5 shadow-[0_12px_44px_-24px_rgba(36,90,132,0.2)] sm:p-7 md:order-2 lg:p-9 xl:p-10 dark:border-border"
          aria-label="Connect this device"
        >
          {children}
        </section>
      </div>
    </main>
  );
}

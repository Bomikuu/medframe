import type { ComponentType, ReactNode } from "react";

export function ScheduleSection({
  id,
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative min-w-0 scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal-ink">
            <Icon className="size-5" aria-hidden />
          </span>
          <div>
            <h2
              id={`${id}-title`}
              tabIndex={-1}
              className="text-base font-semibold focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:text-lg"
            >
              {title}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions && (
          <div className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            {actions}
          </div>
        )}
      </header>
      {children}
    </section>
  );
}

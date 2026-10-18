import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  metadata,
  level = 1,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  metadata?: ReactNode;
  level?: 1 | 2;
  className?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 flex-1 basis-56">
        <Heading
          className={cn(
            "font-semibold tracking-tight wrap-anywhere",
            level === 1 ? "text-2xl sm:text-[1.75rem]" : "text-xl",
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
        {metadata && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {metadata}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

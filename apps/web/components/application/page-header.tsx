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
    <header
      data-page-header
      className={cn("mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4", className)}
    >
      <div className="min-w-0 flex-1 basis-72">
        <Heading
          className={cn(
            "leading-tight font-semibold tracking-tight text-balance wrap-anywhere",
            level === 1 ? "text-[1.75rem] sm:text-[2rem]" : "text-xl",
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

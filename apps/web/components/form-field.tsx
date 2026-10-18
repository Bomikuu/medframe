import type { ReactNode } from "react";

export function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p
          id={`${id}-help`}
          className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

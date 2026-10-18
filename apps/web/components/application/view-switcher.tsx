"use client";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ViewSwitcher({
  value,
  onChange,
}: {
  value: "table" | "cards";
  onChange: (value: "table" | "cards") => void;
}) {
  return (
    <div
      role="group"
      aria-label="Collection view"
      className="flex rounded-lg border border-border p-0.5"
    >
      {(["table", "cards"] as const).map((view) => (
        <Button
          key={view}
          type="button"
          variant={value === view ? "secondary" : "ghost"}
          className="size-10"
          aria-label={`${view === "table" ? "Table" : "Card"} view`}
          aria-pressed={value === view}
          onClick={() => onChange(view)}
        >
          {view === "table" ? <List /> : <LayoutGrid />}
        </Button>
      ))}
    </div>
  );
}

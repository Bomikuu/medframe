"use client";

import type { ReactNode } from "react";
import { Activity, BookOpen, ClipboardList, CreditCard, Scan } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const groups = [
  { id: "overview", label: "Overview", icon: Activity, sections: ["overview"] },
  {
    id: "clinical",
    label: "Clinical",
    icon: ClipboardList,
    sections: ["consultations", "medical", "diagnostics", "treatments"],
  },
  { id: "charts", label: "Charts", icon: Scan, sections: ["dental", "anatomy"] },
  { id: "care", label: "Care & billing", icon: CreditCard, sections: ["services", "billing"] },
  { id: "records", label: "Records", icon: BookOpen, sections: ["documents", "shared", "access"] },
];

export function PatientProfileTabs({
  active,
  sections,
  onTab,
  children,
}: {
  active: string;
  sections: readonly (readonly [string, string, boolean])[];
  onTab: (section: string) => void;
  children: ReactNode;
}) {
  const available = groups
    .map((group) => ({
      ...group,
      items: group.sections.flatMap((id) => sections.filter(([section]) => section === id)),
    }))
    .filter((group) => group.items.length);
  const selected = available.find((group) => group.sections.includes(active)) ?? available[0];
  return (
    <Tabs
      value={selected.id}
      onValueChange={(id) => {
        const group = available.find((item) => item.id === id);
        if (group) onTab(group.items[0][0]);
      }}
      className="min-w-0 gap-5"
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-1.5">
        <TabsList
          aria-label="Patient record groups"
          variant="line"
          className="h-auto min-w-max justify-start gap-1"
        >
          {available.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="min-h-11 gap-2 px-4 after:bottom-[-6px]">
              <Icon aria-hidden className="size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={selected.id}>
        <Tabs value={active} onValueChange={onTab} className="min-w-0 gap-5">
          <div className={cn("overflow-x-auto", selected.items.length === 1 && "hidden")}>
            <TabsList
              aria-label={`${selected.label} sections`}
              className="h-auto min-w-max justify-start gap-1 bg-transparent p-0"
            >
              {selected.items.map(([id, label]) => (
                <TabsTrigger key={id} value={id} className="min-h-10 px-3">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {children}
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

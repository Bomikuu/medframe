"use client";
import { cn } from "@/lib/utils";
import type { Finding, Tooth } from "@/features/consultations/schema";
export function DentalChartGrid({
  teeth,
  dentition,
  selected,
  findings,
  onSelect,
}: {
  teeth: Tooth[];
  dentition: "permanent" | "primary";
  selected: string;
  findings: Finding[];
  onSelect: (tooth: string) => void;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-border p-4" aria-label="2D dental chart">
      {(["upper", "lower"] as const).map((jaw) => (
        <div key={jaw}>
          <p className="mb-2 text-sm font-medium">{jaw === "upper" ? "Upper jaw" : "Lower jaw"}</p>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-16">
            {teeth
              .filter((tooth) => tooth.jaw === jaw)
              .sort((a, b) => {
                const qa = Number(a.id[0]);
                const qb = Number(b.id[0]);
                const right =
                  jaw === "upper"
                    ? dentition === "primary"
                      ? 5
                      : 1
                    : dentition === "primary"
                      ? 8
                      : 4;
                if (qa !== qb) return qa === right ? -1 : 1;
                return qa === right
                  ? Number(b.id[1]) - Number(a.id[1])
                  : Number(a.id[1]) - Number(b.id[1]);
              })
              .map((tooth) => (
                <button
                  type="button"
                  key={tooth.id}
                  aria-label={`Tooth ${tooth.id}, ${tooth.label}, ${findings.filter((item) => item.tooth === tooth.id && item.status === "active").length} active findings`}
                  aria-pressed={selected === tooth.id}
                  onClick={() => {
                    onSelect(tooth.id);
                  }}
                  className={cn(
                    "min-h-12 min-w-10 rounded-md border border-input px-1 text-sm tabular-nums hover:bg-muted",
                    selected === tooth.id && "border-primary bg-primary text-primary-foreground",
                    selected !== tooth.id &&
                      findings.some(
                        (finding) => finding.tooth === tooth.id && finding.status === "active",
                      ) &&
                      "bg-secondary font-semibold underline decoration-2 underline-offset-4",
                  )}
                >
                  {tooth.id}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { Brand } from "@/components/brand";
import Image from "next/image";
import { CalendarDays, Check, ClipboardList, Users, ArrowUpRight } from "lucide-react";
export function ProductPreview({ slide = 0 }: { slide?: number }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-slate-900/5"
      aria-label="Illustrative Medframe workspace"
    >
      <div className="flex items-center gap-2 border-b px-5 py-4 text-xs">
        <Brand className="text-base [&_img]:size-8" />
        <span className="ml-auto text-muted-foreground">Example workspace</span>
      </div>
      <div className="grid grid-cols-[58px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="space-y-6 border-r bg-slate-50/70 px-4 py-7 text-xs text-muted-foreground">
          {[Users, ClipboardList, CalendarDays].map((Icon, i) => (
            <div key={i} className="flex items-center gap-2">
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">
                {["Patients", "Consultations", "Appointments"][i]}
              </span>
            </div>
          ))}
        </div>
        <div className="min-h-72 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">
                {
                  [
                    "Your clinical workspace",
                    "Care, with context",
                    "A clearer clinical view",
                    "Keep care connected",
                    "Ready for your practice",
                  ][slide]
                }
              </p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Patient records. Thoughtful decisions.
              </p>
            </div>
            <ArrowUpRight className="size-4 text-teal-700" />
          </div>
          {slide === 2 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 bg-slate-50">
              <Image
                src="/models/dental-previews/view-front.png"
                alt="Reference dental anatomy"
                width={240}
                height={160}
                unoptimized
                className="h-44 w-full object-contain"
              />
              <Image
                src="/models/anatomy-previews/body-front.png"
                alt="Reference human anatomy"
                width={120}
                height={240}
                unoptimized
                className="h-44 w-full object-contain"
              />
            </div>
          ) : (
            <div className="mt-7 space-y-0 divide-y">
              {["Review patient history", "Document a consultation", "Plan the next step"].map(
                (title, i) => (
                  <div className="flex items-center gap-3 py-5" key={title}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
                      <Check className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {
                          [
                            "One connected patient record",
                            "Notes, findings and treatment",
                            "Appointments and follow-ups",
                          ][i]
                        }
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

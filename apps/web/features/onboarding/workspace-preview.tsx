import type { CSSProperties } from "react";
import { HeartPulse, Users, ClipboardList, LayoutDashboard, Plus, Check } from "lucide-react";
export function WorkspacePreview({
  name,
  logo,
  primary = "#0F2D4A",
  secondary = "#0EA5A4",
  accent = "#22C1B6",
}: {
  name: string;
  logo?: string | null;
  primary?: string;
  secondary?: string;
  accent?: string;
}) {
  const safe = (value: string, fallback: string) =>
    /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const style = {
    "--preview-primary": safe(primary, "#0F2D4A"),
    "--preview-secondary": safe(secondary, "#0EA5A4"),
    "--preview-accent": safe(accent, "#22C1B6"),
  } as CSSProperties;
  return (
    <section
      style={style}
      className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
      aria-label="Live clinic workspace preview"
    >
      <div className="border-b bg-slate-50/50 px-4 py-3 text-xs text-muted-foreground">
        Your clinic workspace · Preview
      </div>
      <div className="grid min-h-72 grid-cols-[60px_minmax(0,1fr)]">
        <aside className="space-y-7 border-r p-3 text-[var(--preview-secondary)]">
          <div className="grid h-10 place-items-center">
            {logo ? (
              <img
                src={logo}
                alt="Your clinic logo preview"
                className="max-h-10 max-w-full object-contain"
              />
            ) : (
              <HeartPulse className="size-6" />
            )}
          </div>
          {[LayoutDashboard, Users, ClipboardList].map((Icon, index) => (
            <Icon key={index} className="mx-auto size-4" />
          ))}
        </aside>
        <div className="min-w-0 p-5">
          <p className="text-base font-semibold wrap-anywhere text-[var(--preview-primary)]">
            {name || "Your clinic"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">The next chapter of your practice.</p>
          <div className="mt-7 flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-[var(--preview-accent)]" />
            Your workspace is taking shape
          </div>
          <div className="mt-5 flex min-h-24 items-center gap-3 rounded-lg border p-4">
            <Check className="size-5 shrink-0 text-[var(--preview-secondary)]" />
            <p className="text-xs leading-6 text-muted-foreground">
              Patient records, consultations and clinical tools, together.
            </p>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--preview-primary)] px-3 py-2 text-xs text-white">
            <Plus className="size-3" />
            Register patient
          </div>
        </div>
      </div>
    </section>
  );
}

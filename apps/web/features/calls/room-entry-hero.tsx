import { Brand } from "@/components/brand";
import { MedframeScene } from "@/components/illustrations/medframe-scene";
import { Video, MessageSquare, ShieldCheck } from "lucide-react";

const features = [
  { icon: Video, title: "Face-to-face consultation", detail: "Meet your doctor by video" },
  {
    icon: MessageSquare,
    title: "Share messages and files",
    detail: "Keep the conversation in your appointment",
  },
  {
    icon: ShieldCheck,
    title: "A private appointment room",
    detail: "Patient entry is protected by your PIN",
  },
];

export function RoomEntryHero() {
  return (
    <aside className="relative isolate hidden min-h-svh min-w-0 flex-col justify-center border-r border-sky-100 bg-background px-8 py-9 lg:flex xl:px-12 2xl:px-16 dark:border-border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-12 right-12 h-24 w-28 bg-[radial-gradient(circle,#c8e0f5_1.5px,transparent_1.5px)] [background-size:22px_22px] dark:opacity-15" />
        <div className="absolute bottom-28 left-5 h-20 w-24 bg-[radial-gradient(circle,#c8e0f5_1.5px,transparent_1.5px)] [background-size:22px_22px] dark:opacity-15" />
        <div className="absolute top-[28%] -left-48 size-64 rounded-full border border-dashed border-cyan-200/60 dark:opacity-15" />
        <div className="absolute -top-64 -left-40 size-[32rem] rounded-full bg-sky-100/30 dark:opacity-10" />
      </div>
      <div className="mx-auto grid w-full max-w-2xl gap-7">
        <Brand />
        <div>
          <h2 className="max-w-xl text-[clamp(2rem,3.2vw,3.25rem)] leading-[1.12] font-semibold tracking-tight text-primary">
            Your appointment,
            <span className="block text-teal-ink">where you are.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground xl:text-base">
            Meet your doctor in a private video room, from a place where you feel comfortable.
          </p>
        </div>
        <MedframeScene
          name="online-waiting-room"
          className="max-w-2xl"
          imageClassName="max-h-[38svh]"
          sizes="(min-width: 1536px) 600px, (min-width: 1024px) 45vw, 90vw"
        />
        <ul className="grid grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="flex flex-col items-start gap-2.5 2xl:flex-row">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-soft text-teal-ink">
                <Icon aria-hidden className="size-[18px]" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-xs leading-5 font-semibold text-primary">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

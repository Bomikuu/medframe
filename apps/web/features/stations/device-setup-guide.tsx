import { CheckCheck, ChevronDown, CirclePlus, KeyRound } from "lucide-react";

const steps = [
  {
    title: "Create device",
    description: "Set its name and allowed functions.",
    icon: CirclePlus,
  },
  { title: "Pair device", description: "Enter its one-use code on the device.", icon: KeyRound },
  { title: "Approve access", description: "Compare the phrase, then approve.", icon: CheckCheck },
];

export function DeviceSetupGuide() {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-4 focus-visible:outline-2 focus-visible:outline-ring sm:px-6 [&::-webkit-details-marker]:hidden">
        <KeyRound aria-hidden className="size-5 shrink-0 text-teal-ink" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">How to connect a device</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            Create, pair and approve access using a one-use code.
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-border px-5 py-5 sm:px-6">
        <ol className="grid gap-5 sm:grid-cols-3">
          {steps.map(({ title, description, icon: Icon }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-teal-ink" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-3xl border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
          Save the device, then open{" "}
          <strong className="font-medium text-foreground">Pairing code</strong> to copy its code.
          Enter it at <span className="font-medium text-foreground">/station</span> on the receiving
          device. Return to <strong className="font-medium text-foreground">Manage</strong>, refresh
          the connection, and compare the verification phrases before approving. Doctors then use
          their own workspace code; reception opens standard patient kiosks.
        </p>
      </div>
    </details>
  );
}

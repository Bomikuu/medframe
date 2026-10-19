"use client";
import { useCallback, useState } from "react";
import {
  CalendarPlus,
  ClipboardCheck,
  Users,
  CreditCard,
  ArrowLeft,
  Home,
  ShieldCheck,
  Printer,
  HelpCircle,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { LoadingInformation } from "@/components/application/loading-information";
import { AssistedKiosk } from "./assisted-kiosk";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { StationCode } from "../code-input";
import { KioskJourney } from "./kiosk-journey";
import { useKiosk } from "./use-kiosk";
import { clinicTime, taskNames, type Result, type Selection, type Task } from "./types";

const actions = [
  {
    task: "booking",
    title: "Book an appointment",
    detail: "Find a service and a time that works for you.",
    icon: CalendarPlus,
  },
  {
    task: "check_in",
    title: "I’m here for my appointment",
    detail: "Confirm your arrival and receive a queue number.",
    icon: ClipboardCheck,
  },
  {
    task: "walk_in",
    title: "Join the walk-in queue",
    detail: "Choose the service you need today.",
    icon: Users,
  },
  {
    task: "payments",
    title: "Pay for clinic services",
    detail: "Review your bills and continue to the cashier.",
    icon: CreditCard,
  },
] as const;
const empty: Selection = {
  department_id: "",
  provider_id: "",
  date: "",
  start: "",
  appointment_id: "",
};
export function KioskScreen() {
  const kiosk = useKiosk();
  return <KioskContent key={kiosk.cycle} kiosk={kiosk} />;
}
function KioskContent({ kiosk }: { kiosk: ReturnType<typeof useKiosk> }) {
  const [selection, setSelection] = useState<Selection>(empty);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birth, setBirth] = useState("");
  const [requestId, setRequestId] = useState("");
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const onError = useCallback((message: string) => setNotice(message), []);
  const exitStaff = useCallback(() => kiosk.setView("waiting"), [kiosk.setView]);
  function clearFields() {
    setSelection(empty);
    setCode("");
    setName("");
    setPhone("");
    setBirth("");
    setRequestId("");
    setNotice("");
  }
  async function home() {
    clearFields();
    await kiosk.home();
  }
  async function finish() {
    clearFields();
    await kiosk.reset();
  }
  function start(task: Task) {
    clearFields();
    setRequestId(crypto.randomUUID());
    kiosk.start(task);
  }
  const setup = kiosk.setup;
  const department = setup?.departments.find((item) => item.id === selection.department_id);
  const provider = setup?.providers.find((item) => item.id === selection.provider_id);
  async function confirm() {
    const action = {
      booking: "book",
      check_in: "check_in",
      walk_in: "walk_in",
      payments: "cashier",
    }[kiosk.task];
    const result = await kiosk.run<Result>({ action, ...selection, request_id: requestId });
    if (result) kiosk.complete(result);
  }
  const timed =
    kiosk.view !== "staff" && (kiosk.view !== "home" || !!kiosk.session) && kiosk.remaining <= 30;
  return (
    <main
      id="main"
      className="min-h-dvh bg-background"
      onPointerDown={kiosk.activity}
      onKeyDown={kiosk.activity}
    >
      <header className="flex min-h-24 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-4 sm:px-10">
        <Brand />
        <div className="text-right">
          <p className="text-sm font-semibold">{setup?.clinic ?? "Patient Station"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {setup?.branch ?? "Secure clinic kiosk"}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-12">
        {!setup ? (
          <section className="mx-auto grid max-w-lg gap-5 py-12">
            <h1 className="text-2xl font-semibold">
              {kiosk.busy ? "Opening the kiosk…" : "This kiosk needs attention"}
            </h1>
            {kiosk.busy ? (
              <LoadingInformation
                title="Checking this kiosk"
                detail="Checking device approval, clinic services and the secure connection. Earlier patient information is cleared before this screen opens."
              />
            ) : (
              <p role="alert" className="leading-7 text-muted-foreground">
                {kiosk.error}
              </p>
            )}
            {!kiosk.busy && (
              <>
                <Button type="button" onClick={() => void home()}>
                  Try again
                </Button>
                <ButtonLink href="/station" variant="outline">
                  Device connection
                </ButtonLink>
              </>
            )}
          </section>
        ) : (
          <>
            {kiosk.view !== "home" && kiosk.view !== "staff" && (
              <nav
                aria-label="Kiosk navigation"
                className="mb-7 flex flex-wrap items-center justify-between gap-3 print:hidden"
              >
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12"
                    onClick={() => {
                      if (kiosk.view === "review") kiosk.setView("choose");
                      else void home();
                    }}
                    disabled={kiosk.busy}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-12"
                    onClick={() => void home()}
                    disabled={kiosk.busy}
                  >
                    <Home />
                    Home
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-12"
                  onClick={() => void home()}
                  disabled={kiosk.busy}
                >
                  Cancel
                </Button>
              </nav>
            )}
            {kiosk.view === "home" ? (
              <>
                <div className="mb-10 max-w-2xl">
                  <h1 className="text-3xl leading-tight font-semibold sm:text-4xl">
                    Welcome. What brings you in today?
                  </h1>
                  <p className="mt-4 text-base leading-7 text-muted-foreground">
                    Choose an option to get started. Reception is here if you need a hand.
                  </p>
                </div>
                {kiosk.session ? (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
                    <div>
                      <p className="font-semibold">{kiosk.session.patient_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Selected by reception · continue with any task below
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void finish()}
                      disabled={kiosk.busy}
                    >
                      Finish / change patient
                    </Button>
                  </div>
                ) : (
                  !setup.strict_verification && (
                    <p className="mb-6 rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
                      Enter your name and contact details to get started. Reception verifies your
                      identity before opening your record. No patient search is shown on this
                      screen.
                    </p>
                  )
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {actions.map(({ task, title, detail, icon: Icon }) => (
                    <button
                      type="button"
                      key={task}
                      onClick={() => start(task)}
                      disabled={kiosk.busy || !setup.functions.includes(task)}
                      className="group hover:bg-teal-wash/40 flex min-h-44 items-start gap-5 rounded-xl border border-border bg-card p-6 text-left transition-colors hover:border-teal-ink focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50 sm:p-7"
                    >
                      <Icon className="mt-1 size-8 shrink-0 text-teal-ink" strokeWidth={1.6} />
                      <span className="grid gap-3">
                        <strong className="text-xl leading-7 font-semibold">{title}</strong>
                        <span className="text-sm leading-6 text-muted-foreground">
                          {detail}
                          {!setup.functions.includes(task) && " · Not enabled on this device"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-7 flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-ink" />
                  Your information is cleared when you finish or leave the kiosk inactive.
                </p>
                {!kiosk.session && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 min-h-12"
                    onClick={() => kiosk.setView("staff")}
                  >
                    Staff-assisted mode
                  </Button>
                )}
              </>
            ) : kiosk.view === "staff" ? (
              <AssistedKiosk onExit={exitStaff} />
            ) : (
              <section className="mx-auto max-w-3xl">
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold sm:text-3xl">
                    {kiosk.view === "done"
                      ? "You're all set"
                      : kiosk.view === "register"
                        ? "Tell us who you are"
                        : kiosk.view === "waiting"
                          ? "Reception will open your session"
                          : kiosk.view === "verify"
                            ? "First, verify it's you"
                            : kiosk.view === "review"
                              ? "Check before you confirm"
                              : taskNames[kiosk.task]}
                  </h1>
                  {kiosk.session && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {kiosk.session.patient_name} · verified for this kiosk session
                    </p>
                  )}
                </div>
                {kiosk.view === "waiting" && (
                  <div className="grid gap-5">
                    {kiosk.result?.kind === "intake" && (
                      <p
                        role="status"
                        className="rounded-lg bg-teal-soft p-5 text-sm leading-6 text-teal-ink"
                      >
                        Identity details sent to reception · Reference {kiosk.result.reference}.
                        Please wait while staff verify your information.
                      </p>
                    )}
                    <p role="status" className="max-w-xl leading-7 text-muted-foreground">
                      Ask reception to select your patient record and send it to this kiosk. This
                      screen will continue automatically. You do not need to enter a code.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-12 justify-self-start"
                      onClick={() => {
                        setRequestId(crypto.randomUUID());
                        kiosk.setView("register");
                      }}
                    >
                      Enter or update my identity details
                    </Button>
                    {setup.strict_verification && (
                      <Button
                        type="button"
                        className="min-h-12 justify-self-start"
                        onClick={() => kiosk.setView("verify")}
                      >
                        Enter my verification code
                      </Button>
                    )}
                  </div>
                )}
                {kiosk.view === "verify" && (
                  <form
                    className="grid gap-6"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void kiosk.verify(code);
                    }}
                  >
                    <p className="max-w-xl leading-7 text-muted-foreground">
                      Enter the patient verification code from your signed-in patient portal or
                      reception. This is different from the device pairing code.
                    </p>
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold">Patient verification code</label>
                      <StationCode
                        label="Patient verification code"
                        value={code}
                        onChange={setCode}
                        disabled={kiosk.busy}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={kiosk.busy || code.length !== 8}
                      className="min-h-14 justify-self-start px-8"
                    >
                      {kiosk.busy ? "Verifying…" : "Verify and continue"}
                    </Button>
                    <div className="border-t border-border pt-5">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12"
                        onClick={() => kiosk.setView("register")}
                      >
                        I need to register as a new patient
                      </Button>
                    </div>
                  </form>
                )}
                {kiosk.view === "register" && (
                  <form
                    className="grid gap-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void kiosk
                        .run<Result>({
                          action: "register",
                          full_name: name,
                          phone,
                          date_of_birth: birth,
                          request_id: requestId,
                        })
                        .then((result) => {
                          if (result) kiosk.complete(result);
                        });
                    }}
                  >
                    <p className="leading-7 text-muted-foreground">
                      Enter your details whether you are an existing or new patient. Reception will
                      verify your identity and check for an existing record. Submitting this form
                      does not automatically open a record or create an account.
                    </p>
                    <FormField id="intake-name" label="Full name">
                      <Input
                        id="intake-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={160}
                        autoComplete="off"
                        required
                        className="h-12"
                      />
                    </FormField>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField id="intake-phone" label="Contact number">
                        <Input
                          id="intake-phone"
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          minLength={5}
                          maxLength={40}
                          autoComplete="off"
                          required
                          className="h-12"
                        />
                      </FormField>
                      <FormField id="intake-birth" label="Date of birth (optional)">
                        <Input
                          id="intake-birth"
                          type="date"
                          value={birth}
                          onChange={(event) => setBirth(event.target.value)}
                          className="h-12"
                        />
                      </FormField>
                    </div>
                    <Button
                      type="submit"
                      disabled={kiosk.busy}
                      className="min-h-14 justify-self-start px-8"
                    >
                      Send to reception for review
                    </Button>
                  </form>
                )}
                {kiosk.view === "choose" && (
                  <KioskJourney
                    setup={setup}
                    task={kiosk.task}
                    snapshot={kiosk.snapshot}
                    selection={selection}
                    onSelection={(value) => {
                      setSelection(value);
                      setRequestId(crypto.randomUUID());
                      setNotice("");
                    }}
                    busy={kiosk.busy}
                    onReview={() => kiosk.setView("review")}
                    onError={onError}
                  />
                )}
                {kiosk.view === "review" && (
                  <div className="grid gap-6">
                    <dl className="grid gap-5 border-y border-border py-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm text-muted-foreground">Service</dt>
                        <dd className="mt-1 font-semibold">{department?.name}</dd>
                      </div>
                      {provider && (
                        <div>
                          <dt className="text-sm text-muted-foreground">Doctor / dentist</dt>
                          <dd className="mt-1 font-semibold">{provider.name}</dd>
                        </div>
                      )}
                      {selection.start && (
                        <div>
                          <dt className="text-sm text-muted-foreground">Date and time</dt>
                          <dd className="mt-1 font-semibold">
                            {clinicTime(selection.start, setup.timezone, true)}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm text-muted-foreground">Clinic branch</dt>
                        <dd className="mt-1 font-semibold">{setup.branch}</dd>
                      </div>
                    </dl>
                    <p className="leading-7 text-muted-foreground">
                      {kiosk.task === "booking"
                        ? "This confirms an appointment only. Check in when you arrive to join that day's queue."
                        : kiosk.task === "payments"
                          ? "This joins the cashier queue. No payment will be collected or marked paid by this action."
                          : "This admits you to today’s service queue. Staff will call your number when it is your turn."}
                    </p>
                    <Button
                      type="button"
                      className="min-h-14 justify-self-start px-8"
                      disabled={kiosk.busy}
                      onClick={() => void confirm()}
                    >
                      {kiosk.busy
                        ? "Confirming…"
                        : kiosk.task === "booking"
                          ? "Confirm appointment"
                          : "Confirm queue admission"}
                    </Button>
                  </div>
                )}
                {kiosk.view === "done" && kiosk.result && (
                  <div className="grid gap-6">
                    <ClipboardCheck className="size-10 text-teal-ink" />
                    <p className="text-lg leading-8">{kiosk.result.message}</p>
                    {kiosk.result.ticket && (
                      <section
                        aria-label="Your queue ticket"
                        className="border-y border-border py-6"
                      >
                        <p className="text-sm text-muted-foreground">
                          {setup.branch} · {kiosk.result.ticket.department}
                        </p>
                        <p className="my-4 text-5xl font-semibold tabular-nums">
                          {kiosk.result.ticket.label}
                        </p>
                        <p className="text-sm">
                          Issued {clinicTime(kiosk.result.ticket.issued_at, setup.timezone, true)}
                        </p>
                        <p className="mt-3 text-sm leading-6">{kiosk.result.ticket.next_step}</p>
                        {kiosk.result.ticket.queue_number && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Consultation desk number {kiosk.result.ticket.queue_number}
                          </p>
                        )}
                        <p className="mt-3 text-xs text-muted-foreground">
                          Waiting estimate unavailable. Keep your number ready.
                        </p>
                      </section>
                    )}
                    {kiosk.result.appointment && (
                      <p className="text-xl font-semibold">
                        {clinicTime(kiosk.result.appointment.start, setup.timezone, true)} ·{" "}
                        {kiosk.result.appointment.provider}
                      </p>
                    )}
                    {kiosk.result.reference && (
                      <p className="text-xl font-semibold">
                        Reception reference: {kiosk.result.reference}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 print:hidden">
                      {kiosk.result.ticket && (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-12"
                          onClick={() => window.print()}
                        >
                          <Printer />
                          Print using this device
                        </Button>
                      )}
                      {kiosk.session && !setup.strict_verification && (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-14 px-8"
                          onClick={() => void home()}
                        >
                          Do another task
                        </Button>
                      )}
                      <Button type="button" className="min-h-14 px-8" onClick={() => void finish()}>
                        Finish and clear my information
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}
            {(kiosk.error || notice) && (
              <p
                role="alert"
                className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              >
                {kiosk.error || notice}
              </p>
            )}
            <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5 text-sm text-muted-foreground print:hidden">
              <span>Private. Simple. Connected to your clinic.</span>
              <Button
                type="button"
                variant="ghost"
                className="min-h-12"
                onClick={() => setHelp(true)}
              >
                <HelpCircle />
                Ask for help
              </Button>
            </footer>
          </>
        )}
      </div>
      <AlertDialog open={timed}>
        <AlertDialogContent>
          <AlertDialogTitle>Do you need more time?</AlertDialogTitle>
          <AlertDialogDescription>
            Your information clears in {Math.max(0, kiosk.remaining)} seconds. Continue only if you
            are still using this kiosk. The session has a ten-minute maximum.
          </AlertDialogDescription>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => {
                kiosk.activity();
              }}
              disabled={kiosk.busy}
            >
              I’m still here
            </Button>
            <Button type="button" variant="outline" onClick={() => void finish()}>
              Finish and clear
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={help} onOpenChange={setHelp}>
        <AlertDialogContent>
          <AlertDialogTitle>Reception can help</AlertDialogTitle>
          <AlertDialogDescription>
            Please ask the clinic’s reception team for assistance. This button does not send an
            alert or call a staff member.
          </AlertDialogDescription>
          <Button type="button" onClick={() => setHelp(false)}>
            Got it
          </Button>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

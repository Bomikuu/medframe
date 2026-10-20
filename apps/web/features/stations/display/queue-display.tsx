"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Maximize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Brand } from "@/components/brand";
import { Switch } from "@/components/ui/switch";
import { useDisplayPreferences, saveDisplayPreference } from "./preferences";
import { useDisplay } from "./use-display";

export function QueueDisplay() {
  const remote = useDisplay();
  const [sound, setSound] = useState(false);
  const preferences = useDisplayPreferences();
  const preferred = preferences.sound;
  const [spokenOverride, setSpokenOverride] = useState<boolean | null>(null);
  const spoken = spokenOverride ?? preferences.spoken;
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef(new Set<string>());
  const day = useRef("");
  useEffect(() => {
    if (remote.data && day.current !== remote.data.day) {
      day.current = remote.data.day;
      seen.current.clear();
    }

    for (const entry of remote.newCalls) {
      if (!entry.call_token || seen.current.has(entry.call_token)) continue;
      seen.current.add(entry.call_token);
      if (!sound || remote.stale) continue;
      const context = audio.current;
      if (context?.state === "running") {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.5);
      }
      if (spoken && "speechSynthesis" in window) {
        const text = `Queue ${entry.label}${entry.counter ? `. Please proceed to ${entry.counter}` : ""}.`;
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }
    }
  }, [remote.newCalls, remote.data, remote.stale, sound, spoken]);
  useEffect(
    () => () => {
      void audio.current?.close();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (remote.stale || !remote.data) window.speechSynthesis?.cancel();
  }, [remote.stale, remote.data]);
  const data = remote.data;
  const time = data
    ? new Intl.DateTimeFormat(undefined, {
        timeZone: data.timezone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(remote.now))
    : "";
  return (
    <main id="main" className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-border bg-card px-6 py-5 lg:px-10">
        <div className="flex min-w-0 items-center gap-6">
          <Brand />
          <div className="border-l border-border pl-6">
            <h1 className="text-lg font-semibold">{data?.clinic ?? "Clinic queue display"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data?.branch ?? "Approved display device required"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <p
            role="status"
            className={remote.stale ? "text-sm font-medium text-warning" : "text-sm text-teal-ink"}
          >
            {remote.stale
              ? "Connection interrupted · updates paused"
              : data
                ? "Live queue"
                : "Connecting to clinic"}
          </p>
          <time className="text-3xl font-semibold tabular-nums">{time}</time>
        </div>
      </header>
      {!data ? (
        <section
          aria-label="Display connection"
          className="mx-auto grid w-full max-w-2xl gap-5 px-6 py-24"
        >
          <h2 className="text-3xl font-semibold">
            {remote.denied
              ? "This display needs clinic approval"
              : remote.error
                ? "Queue updates are unavailable"
                : "Opening your clinic queue"}
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            {remote.denied
              ? "Ask clinic staff to pair or approve this device in Devices & Stations."
              : remote.error
                ? "Queue numbers are hidden until a fresh update arrives. Please follow the clinic staff’s instructions."
                : "Checking this device and retrieving current queue numbers. Patient records are never shown here."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={remote.reload}>
              <RefreshCw />
              Try again
            </Button>
            {remote.denied && (
              <ButtonLink href="/station" variant="outline">
                Pair this display
              </ButtonLink>
            )}
          </div>
        </section>
      ) : (
        <div className="grid flex-1 gap-8 p-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)] lg:p-10">
          <section aria-label="Now serving" className="min-w-0">
            <h2 className="mb-5 text-2xl font-semibold lg:text-3xl">Now serving</h2>
            {!data.called.length ? (
              <p className="rounded-2xl border border-border bg-card p-10 text-xl text-muted-foreground">
                Please wait for your number to be called.
              </p>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {data.called.map((row) => (
                  <article
                    key={row.key}
                    className="rounded-2xl bg-primary p-6 text-primary-foreground lg:p-8"
                  >
                    <p className="text-base font-medium">
                      {row.department} · {row.status === "called" ? "Please proceed" : "In service"}
                    </p>
                    <p className="my-5 text-6xl font-semibold tracking-tight break-words tabular-nums lg:text-7xl">
                      {row.label}
                    </p>
                    <p className="text-xl font-semibold">{row.counter || row.department}</p>
                    {row.provider && <p className="mt-2 text-base">{row.provider}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
          <section
            aria-label="Coming up"
            className="min-w-0 rounded-2xl border border-border bg-card p-6 lg:p-8"
          >
            <h2 className="text-2xl font-semibold">Coming up</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Listed in each department’s queue order.
            </p>
            {!data.upcoming.length ? (
              <p className="py-10 text-lg text-muted-foreground">No waiting numbers.</p>
            ) : (
              <ol className="mt-5 divide-y divide-border">
                {data.upcoming.map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-4 py-4">
                    <strong className="text-3xl tabular-nums">{row.label}</strong>
                    <div className="text-right">
                      <p className="font-medium">{row.department}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.counter || row.provider || "Wait for your call"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {!!data.announcements.length && (
            <section
              aria-label="Clinic announcements"
              className="border-t border-border pt-6 lg:col-span-2"
            >
              <h2 className="text-sm font-semibold text-muted-foreground">Clinic announcements</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {data.announcements.map((notice, index) => (
                  <p key={index} className="max-w-prose text-lg leading-8 whitespace-pre-wrap">
                    {notice}
                  </p>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-card px-6 py-4 text-sm lg:px-10">
        <p className="text-muted-foreground">
          {remote.contact
            ? `Last contact ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: data?.timezone }).format(new Date(remote.contact))}`
            : "Connecting securely"}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="outline"
            onClick={async () => {
              if (!sound) {
                audio.current ??= new AudioContext();
                await audio.current.resume();
              } else window.speechSynthesis?.cancel();
              setSound(!sound);
              saveDisplayPreference("sound", !sound);
            }}
          >
            {sound ? <Volume2 /> : <VolumeX />}
            {sound ? "Sound on" : preferred ? "Resume sound" : "Enable sound"}
          </Button>
          <label className="flex min-h-11 items-center gap-2">
            <Switch
              checked={spoken}
              disabled={!sound}
              onCheckedChange={(value) => {
                setSpokenOverride(value);
                saveDisplayPreference("spoken", value);
              }}
            />
            Speak queue numbers
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              void document.documentElement.requestFullscreen?.().catch(() => {});
            }}
          >
            <Maximize2 />
            Full screen
          </Button>
        </div>
      </footer>
    </main>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import type { ManageAction } from "../kiosk/staff-dialogs";

export type DisplaySettings = { version: number; announcements: string[] };
export function DisplaySettingsEditor({
  settings,
  run,
  branchId,
}: {
  settings: DisplaySettings;
  run: ManageAction;
  branchId: string;
}) {
  const [notices, setNotices] = useState(() =>
    Array.from({ length: 3 }, (_, index) => settings.announcements[index] ?? ""),
  );
  const [version, setVersion] = useState(settings.version);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges("station-display:" + branchId, dirty, () => {
    setNotices(Array.from({ length: 3 }, (_, index) => settings.announcements[index] ?? ""));
    setVersion(settings.version);
    setDirty(false);
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <section
      aria-label="Queue display settings"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold">TV queue announcements</h2>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
        These notices appear on approved clinic displays. Use public instructions without patient
        details. Leave a notice empty to remove it.
      </p>
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setSaved(false);
          try {
            const result = await run({
              action: "display_settings",
              expected_version: version,
              announcements: notices,
            });
            if (result) {
              setSaved(true);
              setDirty(false);
              setVersion((result as DisplaySettings).version);
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="grid gap-4 lg:grid-cols-3">
          {notices.map((text, index) => (
            <FormField
              key={index}
              id={`display-notice-${index}`}
              label={`Announcement ${index + 1}`}
            >
              <Textarea
                id={`display-notice-${index}`}
                rows={3}
                maxLength={240}
                value={text}
                onChange={(event) => {
                  setNotices((old) =>
                    old.map((value, position) => (position === index ? event.target.value : value)),
                  );
                  setSaved(false);
                  setDirty(true);
                }}
              />
            </FormField>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save display notices"}
          </Button>
          {saved && (
            <p role="status" className="text-sm text-teal-ink">
              Display notices saved.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Upload, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCsrfToken } from "@/lib/auth/client";
import { WorkspacePreview } from "./workspace-preview";
import { Field } from "./field";
import { onboardingClient, message } from "./client";
import { RemoveClinicLogoDocument } from "@/lib/graphql/onboarding/generated";
import type { Fields, Snapshot, References } from "./schema";
export function BrandingStep({
  snapshot,
  references,
  version,
  accept,
  flush,
}: {
  snapshot: Snapshot;
  references: References;
  version: () => number;
  accept: (value: unknown) => unknown;
  flush: () => Promise<unknown>;
}) {
  const { watch, setValue } = useFormContext<Fields>(),
    values = watch();
  const [preview, setPreview] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const local = useRef<string | null>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true,
      url: string | undefined;
    if (snapshot.logo?.state === "clean")
      fetch(`/api/backend/onboarding/logo/${snapshot.logo.id}/content`)
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.blob();
        })
        .then((blob) => {
          url = URL.createObjectURL(blob);
          if (active && !local.current) setPreview(url);
        })
        .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [snapshot.logo?.id, snapshot.logo?.state]);
  useEffect(
    () => () => {
      if (local.current) URL.revokeObjectURL(local.current);
    },
    [],
  );
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Choose a PNG, JPEG or WebP image up to 2 MiB.");
      return;
    }
    setBusy(true);
    try {
      await flush();
      const data = new FormData();
      data.set("file", file);
      data.set("version", String(version()));
      const response = await fetch("/api/backend/onboarding/logo/upload", {
        method: "POST",
        headers: { "X-CSRF-Token": await getCsrfToken() },
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Logo upload failed.");
      accept(result);
      if (local.current) URL.revokeObjectURL(local.current);
      local.current = URL.createObjectURL(file);
      setPreview(local.current);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await flush();
      accept(
        (await onboardingClient().request(RemoveClinicLogoDocument, { version: version() }))
          .removeOnboardingLogo,
      );
      if (local.current) URL.revokeObjectURL(local.current);
      local.current = null;
      setPreview(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-dashed border-border bg-muted/20 p-6"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void upload(event.dataTransfer.files[0]);
        }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-24 w-32 place-items-center rounded-lg border bg-white">
            {preview ? (
              <img
                src={preview}
                alt="Selected clinic logo"
                className="max-h-20 max-w-28 object-contain"
              />
            ) : (
              <ImagePlus className="size-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">Clinic logo</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Drop an image, or choose a file.
              <br />
              PNG, JPEG, WebP · 2 MiB · 2048px maximum
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                <Upload />
                {preview ? "Replace logo" : "Upload logo"}
              </Button>
              {snapshot.logo && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Remove logo"
                  onClick={remove}
                >
                  <X />
                </Button>
              )}
            </div>
            <input
              ref={input}
              type="file"
              aria-label="Choose clinic logo"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </div>
        </div>
        {snapshot.logo && (
          <p role="status" className="mt-4 text-xs text-muted-foreground">
            {snapshot.logo.state === "clean"
              ? "Logo saved and security scan complete."
              : `Logo saved · security scan ${snapshot.logo.state}. The local preview is not an approved logo yet.`}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Field name="short_name" label="Clinic short name (optional)" maxLength={40} />
      <section>
        <h2 className="mb-4 text-base font-semibold">Brand colors</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {["primary", "secondary", "accent"].map((key) => (
            <label
              key={key}
              className="block text-xs font-medium capitalize"
              htmlFor={`brand-${key}`}
            >
              {key}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${key} color picker`}
                  className="size-10 shrink-0 cursor-pointer rounded border p-1"
                  value={
                    /^#[0-9a-f]{6}$/i.test(String(values[key])) ? String(values[key]) : "#0F2D4A"
                  }
                  onChange={(event) => setValue(key, event.target.value, { shouldDirty: true })}
                />
                <Input
                  id={`brand-${key}`}
                  maxLength={7}
                  value={String(values[key] ?? "")}
                  onChange={(event) => setValue(key, event.target.value, { shouldDirty: true })}
                />
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {references.presets.map((preset) => (
            <Button
              type="button"
              size="sm"
              variant="outline"
              key={preset.name}
              onClick={() => {
                for (const key of ["primary", "secondary", "accent"] as const)
                  setValue(key, preset[key], { shouldDirty: true });
              }}
            >
              {preset.name === "Medframe" ? "Reset to Medframe" : preset.name}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Use a dark primary color so action labels remain readable.
        </p>
      </section>
      <WorkspacePreview
        name={String(snapshot.data.clinic.name)}
        logo={preview}
        primary={String(values.primary)}
        secondary={String(values.secondary)}
        accent={String(values.accent)}
      />
    </div>
  );
}

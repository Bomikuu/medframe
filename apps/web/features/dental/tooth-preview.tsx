"use client";

import Image from "next/image";
import type { Tooth } from "@/features/consultations/schema";
import { Button } from "@/components/ui/button";

export function ToothPreview({
  tooth,
  className = "h-24 w-20",
}: {
  tooth: string;
  className?: string;
}) {
  if (!/^[1-4][1-8]$/.test(tooth))
    return (
      <span
        className={`flex items-center justify-center text-xs text-muted-foreground ${className}`}
      >
        {tooth}
      </span>
    );
  return (
    <Image
      src={`/models/dental-previews/tooth-${tooth}.png`}
      alt={`Anatomical preview of tooth ${tooth}`}
      width={192}
      height={224}
      unoptimized
      className={`object-contain ${className}`}
    />
  );
}

export function ToothIdentity({ tooth }: { tooth: Tooth | undefined }) {
  if (!tooth) return null;
  return (
    <div className="my-5 grid grid-cols-[88px_1fr] items-center gap-4">
      <div className="flex h-28 items-center justify-center rounded-lg border border-border bg-muted/40">
        <ToothPreview tooth={tooth.id} />
      </div>
      <dl className="grid gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Tooth type</dt>
          <dd className="mt-1 text-sm font-medium capitalize">
            {tooth.label.replace(/^(upper|lower) (left|right) /i, "")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Jaw</dt>
          <dd className="mt-1 font-medium">
            {tooth.jaw === "upper" ? "Upper (Maxillary)" : "Lower (Mandibular)"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">FDI number</dt>
          <dd className="mt-1 font-medium tabular-nums">{tooth.id}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ToothSurfacePicker({
  tooth,
  value,
  onChange,
}: {
  tooth: Tooth | undefined;
  value: string | null;
  onChange: (surface: string | null) => void;
}) {
  if (!tooth) return null;
  return (
    <section aria-label="Tooth surfaces" className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tooth surfaces</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          aria-pressed={!value}
        >
          Whole tooth
        </Button>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {tooth.surfaces.map((surface) => (
          <Button
            key={surface}
            type="button"
            variant="outline"
            aria-label={`Select ${surface} surface`}
            aria-pressed={value === surface}
            onClick={() => onChange(value === surface ? null : surface)}
            className={`grid h-auto min-w-0 gap-1 px-1 py-2 text-[11px] capitalize ${value === surface ? "border-primary bg-secondary text-secondary-foreground" : ""}`}
          >
            <ToothPreview tooth={tooth.id} className="mx-auto h-12 w-8" />
            <span>{surface}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Surface labels are assigned manually. Previews identify the tooth, not a segmented surface.
      </p>
    </section>
  );
}

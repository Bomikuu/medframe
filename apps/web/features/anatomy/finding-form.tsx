"use client";
import { useFormContext } from "react-hook-form";
import type { EncounterForm } from "@/features/consultations/schema";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { structureLabel } from "./asset-registry";
const selectClass = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
export function FindingForm({ index, readOnly }: { index: number; readOnly: boolean }) {
  const { register, getValues, formState } = useFormContext<EncounterForm>();
  const value = getValues(`content.anatomy_findings.${index}`);
  const prefix = `anatomy-${value.key}`;
  return (
    <fieldset disabled={readOnly} className="grid gap-5">
      <legend className="mb-3 text-lg font-semibold">Finding details</legend>
      <p className="text-sm font-medium">{structureLabel(value.structure_id)}</p>
      <p className="text-xs text-muted-foreground">
        {value.anchor?.kind === "model"
          ? "Pinned to exact 3D mesh"
          : value.anchor?.kind === "map"
            ? `Pinned on ${value.anchor.view} map`
            : "Named structure; no point pinned"}
      </p>
      <FormField
        id={`${prefix}-description`}
        label="Finding description"
        error={formState.errors.content?.anatomy_findings?.[index]?.description?.message}
      >
        <Textarea
          id={`${prefix}-description`}
          rows={3}
          maxLength={240}
          {...register(`content.anatomy_findings.${index}.description`)}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField id={`${prefix}-category`} label="Certainty">
          <select
            id={`${prefix}-category`}
            className={selectClass}
            {...register(`content.anatomy_findings.${index}.category`)}
          >
            {["reported", "observed", "suspected", "confirmed"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </FormField>
        <FormField id={`${prefix}-severity`} label="Severity">
          <select
            id={`${prefix}-severity`}
            className={selectClass}
            {...register(`content.anatomy_findings.${index}.severity`)}
          >
            {["unknown", "mild", "moderate", "severe"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField id={`${prefix}-status`} label="Finding status">
        <select
          id={`${prefix}-status`}
          className={selectClass}
          {...register(`content.anatomy_findings.${index}.status`)}
        >
          {["active", "resolved", "historical", "entered_in_error"].map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id={`${prefix}-notes`} label="Clinical notes">
        <Textarea
          id={`${prefix}-notes`}
          rows={4}
          maxLength={1000}
          {...register(`content.anatomy_findings.${index}.notes`)}
        />
      </FormField>
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          Optional terminology
        </summary>
        <div className="mt-3 grid gap-3">
          <FormField id={`${prefix}-system`} label="Terminology system">
            <Input
              id={`${prefix}-system`}
              maxLength={80}
              {...register(`content.anatomy_findings.${index}.terminology_system`)}
            />
          </FormField>
          <FormField id={`${prefix}-code`} label="Code">
            <Input
              id={`${prefix}-code`}
              maxLength={80}
              {...register(`content.anatomy_findings.${index}.code`)}
            />
          </FormField>
        </div>
      </details>
    </fieldset>
  );
}

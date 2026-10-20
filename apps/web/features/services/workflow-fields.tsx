"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import type { ServiceValues } from "./schema";

export function WorkflowFields({ form }: { form: UseFormReturn<ServiceValues> }) {
  const rows = useFieldArray({ control: form.control, name: "workflow" });
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <div>
        <h3 className="font-semibold">Workflow</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A checklist copied to each patient. Steps never complete a clinical procedure or book a
          visit.
        </p>
      </div>
      {rows.fields.map((row, index) => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <FormField
            id={`service-step-${index}`}
            label={`Step ${index + 1}`}
            error={form.formState.errors.workflow?.[index]?.label?.message}
          >
            <Input
              id={`service-step-${index}`}
              maxLength={240}
              {...form.register(`workflow.${index}.label`)}
            />
          </FormField>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!index}
              aria-label={`Move step ${index + 1} up`}
              onClick={() => rows.move(index, index - 1)}
            >
              Up
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={index === rows.fields.length - 1}
              aria-label={`Move step ${index + 1} down`}
              onClick={() => rows.move(index, index + 1)}
            >
              Down
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Remove step ${index + 1}`}
              onClick={() => rows.remove(index)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      {!rows.fields.length && (
        <p className="text-sm text-muted-foreground">
          No checklist steps. Staff can explicitly complete this service when ready.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={rows.fields.length >= 40}
        onClick={() => rows.append({ label: "" })}
      >
        Add workflow step
      </Button>
    </section>
  );
}

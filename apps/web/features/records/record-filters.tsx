"use client";

import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/features/patients/form-controls";

export type RecordFilters = {
  query?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  tooth?: string;
  author_id?: string;
};
export function RecordFilterForm({
  onApply,
  statuses = [],
  types = [],
  tooth = false,
  authors = [],
}: {
  onApply: (filters: RecordFilters) => void;
  statuses?: string[];
  types?: string[];
  tooth?: boolean;
  authors?: { value: string; label: string }[];
}) {
  const filterId = useId();
  const form = useForm({
    defaultValues: {
      query: "",
      status: "all",
      type: "all",
      date_from: "",
      date_to: "",
      tooth: "",
      author_id: "all",
    },
  });
  const watchedForm = useWatch({ control: form.control });
  return (
    <form
      noValidate
      className="mb-6 grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={form.handleSubmit((values) =>
        onApply(
          Object.fromEntries(
            Object.entries(values).filter(([, value]) => value && value !== "all"),
          ),
        ),
      )}
    >
      <FormField id={`${filterId}-record-query`} label="Search records">
        <Input id={`${filterId}-record-query`} maxLength={160} {...form.register("query")} />
      </FormField>
      {!!statuses.length && (
        <FormSelect
          id={`${filterId}-record-status`}
          label="Status"
          value={watchedForm.status ?? ""}
          onChange={(value) => form.setValue("status", value)}
          options={[
            { value: "all", label: "All statuses" },
            ...statuses.map((value) => ({ value, label: value.replaceAll("_", " ") })),
          ]}
        />
      )}
      {!!types.length && (
        <FormSelect
          id={`${filterId}-record-type`}
          label="Record type"
          value={watchedForm.type ?? ""}
          onChange={(value) => form.setValue("type", value)}
          options={[
            { value: "all", label: "All types" },
            ...types.map((value) => ({ value, label: value.replaceAll("_", " ") })),
          ]}
        />
      )}
      <FormField id={`${filterId}-record-from`} label="From (clinic date)">
        <Input id={`${filterId}-record-from`} type="date" {...form.register("date_from")} />
      </FormField>
      <FormField id={`${filterId}-record-to`} label="Through (clinic date)">
        <Input id={`${filterId}-record-to`} type="date" {...form.register("date_to")} />
      </FormField>
      {tooth && (
        <FormField id={`${filterId}-record-tooth`} label="Filter by FDI tooth">
          <Input
            id={`${filterId}-record-tooth`}
            className="max-w-32"
            inputMode="numeric"
            maxLength={2}
            {...form.register("tooth")}
          />
        </FormField>
      )}
      {!!authors.length && (
        <FormSelect
          id={`${filterId}-record-author`}
          label="Author"
          value={watchedForm.author_id ?? ""}
          onChange={(value) => form.setValue("author_id", value)}
          options={[{ value: "all", label: "All authors" }, ...authors]}
        />
      )}
      <div className="flex items-end gap-2">
        <Button>Apply filters</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            onApply({});
          }}
        >
          Clear filters
        </Button>
      </div>
    </form>
  );
}
export function PageControls({
  after,
  next,
  onChange,
}: {
  after?: string;
  next: string | null;
  onChange: (after?: string) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {after && (
        <Button type="button" variant="outline" onClick={() => onChange()}>
          Newest records
        </Button>
      )}
      {next && (
        <Button type="button" variant="outline" onClick={() => onChange(next)}>
          Older records
        </Button>
      )}
    </div>
  );
}

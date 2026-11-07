"use client";

import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Filter, Search, X } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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
const defaults = {
  query: "",
  status: "all",
  type: "all",
  date_from: "",
  date_to: "",
  tooth: "",
  author_id: "all",
};
type FilterKey = keyof typeof defaults;

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
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<RecordFilters>({});
  const form = useForm({ defaultValues: defaults });
  const values = useWatch({ control: form.control });
  function apply(next: typeof defaults) {
    const selected = Object.fromEntries(
      Object.entries(next).filter(([, value]) => value && value !== "all"),
    );
    setApplied(selected);
    onApply(selected);
  }
  function remove(key: FilterKey) {
    form.setValue(key, defaults[key]);
    apply(form.getValues());
  }
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(apply)}
      className="@container grid min-w-0 gap-4 rounded-xl border border-border bg-card p-4"
    >
      <Collapsible open={open} onOpenChange={setOpen} className="grid min-w-0 gap-4">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <FormField id={`${filterId}-record-query`} label="Search records">
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
                />
                <Input
                  id={`${filterId}-record-query`}
                  placeholder="Search by name or description"
                  maxLength={160}
                  className="pl-10"
                  {...form.register("query")}
                />
              </div>
            </FormField>
          </div>
          {!!types.length && (
            <div className="min-w-0 grow basis-40 @[540px]:max-w-52">
              <FormSelect
                id={`${filterId}-record-type`}
                label="Record type"
                value={values.type ?? "all"}
                onChange={(value) => form.setValue("type", value)}
                options={[
                  { value: "all", label: "All types" },
                  ...types.map((value) => ({ value, label: value.replaceAll("_", " ") })),
                ]}
              />
            </div>
          )}
          <CollapsibleTrigger asChild>
            <Button type="button" variant={open ? "secondary" : "outline"}>
              <Filter />
              Filters
              {Object.keys(applied).filter((key) => !["query", "type"].includes(key)).length >
                0 && (
                <Badge variant="secondary">
                  {Object.keys(applied).filter((key) => !["query", "type"].includes(key)).length}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <Button type="submit">Apply filters</Button>
        </div>
        <CollapsibleContent className="grid gap-4 border-t border-border pt-4 data-[state=closed]:hidden">
          <div className="grid min-w-0 gap-4 @[420px]:grid-cols-2 @[760px]:grid-cols-3">
            {!!statuses.length && (
              <FormSelect
                id={`${filterId}-record-status`}
                label="Status"
                value={values.status ?? "all"}
                onChange={(value) => form.setValue("status", value)}
                options={[
                  { value: "all", label: "All statuses" },
                  ...statuses.map((value) => ({ value, label: value.replaceAll("_", " ") })),
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
                value={values.author_id ?? "all"}
                onChange={(value) => form.setValue("author_id", value)}
                options={[{ value: "all", label: "All authors" }, ...authors]}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      {!!Object.keys(applied).length && (
        <div
          className="flex flex-wrap items-center gap-2 border-t border-border pt-3"
          aria-label="Active filters"
        >
          {Object.entries(applied).map(([key, value]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant="secondary"
              className="h-auto min-h-8 max-w-full gap-2 whitespace-normal"
              onClick={() => remove(key as FilterKey)}
            >
              <span className="min-w-0 wrap-anywhere">
                {key === "author_id"
                  ? (authors.find((author) => author.value === value)?.label ?? "Author")
                  : `${key.replaceAll("_", " ")}: ${value}`}
              </span>
              <X className="size-3" />
              <span className="sr-only">Remove filter</span>
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              form.reset();
              setApplied({});
              onApply({});
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
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
  if (!after && !next) return null;
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

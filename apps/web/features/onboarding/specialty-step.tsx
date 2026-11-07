"use client";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { specialtyPresentation } from "./specialty-presentation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Choice } from "./field";
import type { Fields, References } from "./schema";
export function SpecialtyStep({ references }: { references: References }) {
  const [search, setSearch] = useState("");
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<Fields>();
  const codes = (watch("codes") as string[]) ?? [],
    providers = (watch("provider_types") as string[]) ?? [];
  function toggle(name: string, values: string[], value: string) {
    setValue(
      name,
      values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      { shouldDirty: true, shouldValidate: true },
    );
  }
  const query = search.trim().toLowerCase();
  const matches = references.specialties.filter((item) => {
    const { description } = specialtyPresentation(item.name, item.category);
    return `${item.name} ${description}`.toLowerCase().includes(query);
  });
  const categories = [...new Set(matches.map((item) => item.category))];
  return (
    <div className="space-y-8">
      <section aria-labelledby="specialty-selection-title" className="space-y-5">
        <div>
          <h2 id="specialty-selection-title" className="text-base font-semibold">
            What care does your clinic offer?
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Select all specialties that apply. You can choose from both dental and medical care.
          </p>
        </div>
        <div className="relative">
          <Search
            className="absolute top-3.5 left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search specialties"
            placeholder="Search by specialty or type of care"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pr-10 pl-10"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear specialty search"
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => setSearch("")}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{codes.length}</span>{" "}
            {codes.length === 1 ? "specialty" : "specialties"} selected
          </p>
          {codes.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setValue("codes", [], { shouldDirty: true, shouldValidate: true })}
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear selection
            </Button>
          )}
        </div>
        {errors.codes && (
          <p role="alert" className="text-sm text-destructive">
            {String(errors.codes.message)}
          </p>
        )}
        {matches.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Search className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold">No specialties found</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Try a specialty name or a type of care, such as skin or braces.
            </p>
            <Button variant="link" type="button" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        )}
        {categories.map((category) => (
          <section
            key={category}
            aria-labelledby={`specialty-group-${category}`}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <h3 id={`specialty-group-${category}`} className="text-sm font-semibold">
                {category === "dental"
                  ? "Dental care"
                  : category === "medicine"
                    ? "Medical care"
                    : "Other specialties"}
              </h3>
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {matches
                .filter((item) => item.category === category)
                .map((item) => {
                  const { icon: Icon, description } = specialtyPresentation(
                    item.name,
                    item.category,
                  );
                  const selected = codes.includes(item.code);
                  return (
                    <button
                      type="button"
                      key={item.code}
                      aria-label={item.name}
                      aria-pressed={selected}
                      aria-describedby={`specialty-description-${item.code}`}
                      onClick={() => toggle("codes", codes, item.code)}
                      className={cn(
                        "group relative flex h-full min-h-40 flex-col rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        selected
                          ? "border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950"
                          : "border-border bg-card hover:border-teal-400 hover:bg-muted/40",
                      )}
                    >
                      <div className="mb-3 flex w-full items-center justify-between gap-3">
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg",
                            selected
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-[18px]" aria-hidden="true" />
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-medium",
                            selected ? "text-teal-800 dark:text-teal-200" : "text-muted-foreground",
                          )}
                          aria-hidden="true"
                        >
                          {selected && "Selected"}
                          <span
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full border",
                              selected
                                ? "border-teal-700 bg-teal-700 text-white"
                                : "border-input bg-card group-hover:border-teal-500",
                            )}
                          >
                            {selected && <Check className="size-3.5" />}
                          </span>
                        </span>
                      </div>
                      <span className="text-sm leading-5 font-semibold">{item.name}</span>
                      <span
                        id={`specialty-description-${item.code}`}
                        className="mt-1.5 text-xs leading-5 text-muted-foreground"
                      >
                        {description}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </section>
      <Field
        name="custom"
        label="Request another specialty (optional)"
        maxLength={80}
        hint="Requests do not grant professional credentials or add a verified specialty."
      />
      <section className="space-y-5 border-t pt-7">
        <h2 className="text-base font-semibold">Your care team</h2>
        <Choice
          name="provider_count"
          label="How many doctors or dentists work here?"
          options={[
            { value: "just_me", label: "Just me" },
            { value: "2_5", label: "2–5" },
            { value: "6_10", label: "6–10" },
            { value: "11_20", label: "11–20" },
            { value: "20_plus", label: "20+" },
          ]}
        />
        <p className="text-sm font-medium">Provider types</p>
        {errors.provider_types && (
          <p role="alert" className="text-sm text-destructive">
            {String(errors.provider_types.message)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {["dentist", "physician", "nurse", "medical_assistant", "other"].map((kind) => (
            <Button
              type="button"
              key={kind}
              variant={providers.includes(kind) ? "secondary" : "outline"}
              aria-pressed={providers.includes(kind)}
              onClick={() => toggle("provider_types", providers, kind)}
              className="capitalize"
            >
              {kind.replaceAll("_", " ")}
            </Button>
          ))}
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          No individual staff accounts are needed now. Clinical access is assigned separately.
        </p>
      </section>
    </div>
  );
}

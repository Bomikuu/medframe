"use client";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Choice } from "./field";
import type { Fields, References } from "./schema";
export function SpecialtyStep({ references }: { references: References }) {
  const [search, setSearch] = useState("");
  const { watch, setValue } = useFormContext<Fields>();
  const codes = (watch("codes") as string[]) ?? [],
    providers = (watch("provider_types") as string[]) ?? [];
  function toggle(name: string, values: string[], value: string) {
    setValue(
      name,
      values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      { shouldDirty: true },
    );
  }
  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="absolute top-3.5 left-3 size-4 text-muted-foreground" />
        <Input
          aria-label="Search specialties"
          placeholder="Search specialties"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10"
        />
      </div>
      {["dental", "medicine"].map((category) => (
        <section key={category}>
          <h2 className="mb-4 text-sm font-semibold">
            {category === "dental" ? "Dental care" : "General medicine"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {references.specialties
              .filter(
                (item) =>
                  item.category === category &&
                  item.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((item) => (
                <button
                  type="button"
                  key={item.code}
                  aria-pressed={codes.includes(item.code)}
                  onClick={() => toggle("codes", codes, item.code)}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted aria-pressed:border-teal-700 aria-pressed:bg-teal-50 aria-pressed:text-teal-900"
                >
                  <span>{item.name}</span>
                  {codes.includes(item.code) && <Check className="size-4 shrink-0" />}
                </button>
              ))}
          </div>
        </section>
      ))}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{codes.length} specialties selected</span>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setValue("codes", [], { shouldDirty: true })}
        >
          Clear selection
        </Button>
      </div>
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

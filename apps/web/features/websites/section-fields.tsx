"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import type { UseFormReturn } from "react-hook-form";
import type { WebsiteContent, WebsiteSetup } from "./schema";

export function AssetSelect({
  label,
  value,
  onChange,
  assets,
  id,
}: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  assets: WebsiteSetup["assets"];
  id: string;
}) {
  return (
    <FormSelect
      id={id}
      label={label}
      value={value ?? "none"}
      onChange={(v) => onChange(v === "none" ? null : v)}
      options={[
        { value: "none", label: "No image" },
        ...assets.filter((a) => a.state === "clean").map((a) => ({ value: a.id, label: a.label })),
      ]}
    />
  );
}

export function SectionFields({
  form,
  index,
  content,
  assets,
}: {
  form: UseFormReturn<WebsiteContent>;
  index: number;
  content: WebsiteContent;
  assets: WebsiteSetup["assets"];
}) {
  const section = content.sections[index];
  const setSection = (value: typeof section) =>
    form.setValue(`sections.${index}`, value, { shouldDirty: true });
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold capitalize">{section.kind} section</h3>
        <label className="flex items-center gap-3 text-sm">
          Visible
          <Switch
            checked={section.visible}
            onCheckedChange={(visible) => setSection({ ...section, visible })}
          />
        </label>
      </div>
      <FormField id="section-title" label="Section heading">
        <Input id="section-title" maxLength={120} {...form.register(`sections.${index}.title`)} />
      </FormField>
      <FormField id="section-body" label="Introduction / description">
        <Textarea
          id="section-body"
          rows={5}
          maxLength={4000}
          {...form.register(`sections.${index}.body`)}
        />
      </FormField>
      <AssetSelect
        id="section-image"
        label="Section image"
        value={section.image_id}
        onChange={(image_id) => setSection({ ...section, image_id })}
        assets={assets}
      />
      {["services", "team"].includes(section.kind) && (
        <div className="grid gap-5 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {section.kind === "team" ? "Public team profiles" : "Services"}
            </h4>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={section.items.length >= 12}
              onClick={() =>
                setSection({
                  ...section,
                  items: [...section.items, { title: "", description: "", image_id: null }],
                })
              }
            >
              Add {section.kind === "team" ? "person" : "service"}
            </Button>
          </div>
          {section.items.map((item, i) => (
            <div key={i} className="grid gap-3 border-b border-border pb-5">
              <FormField
                id={`item-${i}-title`}
                label={section.kind === "team" ? "Display name" : "Service name"}
              >
                <Input
                  id={`item-${i}-title`}
                  maxLength={100}
                  {...form.register(`sections.${index}.items.${i}.title`)}
                />
              </FormField>
              <FormField
                id={`item-${i}-body`}
                label={
                  section.kind === "team" ? "Role and public biography" : "Service description"
                }
              >
                <Textarea
                  id={`item-${i}-body`}
                  rows={3}
                  maxLength={1000}
                  {...form.register(`sections.${index}.items.${i}.description`)}
                />
              </FormField>
              <AssetSelect
                id={`item-${i}-image`}
                label={section.kind === "team" ? "Public portrait" : "Service image"}
                value={item.image_id}
                onChange={(image_id) =>
                  setSection({
                    ...section,
                    items: section.items.map((v, j) => (j === i ? { ...v, image_id } : v)),
                  })
                }
                assets={assets}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="justify-self-start text-destructive"
                onClick={() =>
                  setSection({ ...section, items: section.items.filter((_, j) => j !== i) })
                }
              >
                Remove {section.kind === "team" ? "person" : "service"}
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 border-t border-border pt-4">
        {[-1, 1].map((direction) => (
          <Button
            key={direction}
            type="button"
            size="sm"
            variant="outline"
            disabled={index + direction < 0 || index + direction >= content.sections.length}
            onClick={() => {
              const next = [...content.sections];
              [next[index], next[index + direction]] = [next[index + direction], next[index]];
              form.setValue("sections", next, { shouldDirty: true });
            }}
          >
            {direction < 0 ? "Move up" : "Move down"}
          </Button>
        ))}
      </div>
    </div>
  );
}

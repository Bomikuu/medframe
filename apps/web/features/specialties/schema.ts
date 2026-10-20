import { z } from "zod";

const option = z.object({ code: z.string(), name: z.string() });
export const specialtySetupSchema = z.object({
  version: z.number(),
  selected: z.array(z.string()),
  catalog: z.array(option.extend({ category: z.string(), active: z.boolean() })),
  legacy: z.array(option),
  starters: z.array(
    z.object({
      specialty: z.string(),
      name: z.string(),
      prompts: z.object({
        subjective: z.string(),
        objective: z.string(),
        assessment: z.string(),
        plan: z.string(),
      }),
      observation_labels: z.array(z.string()),
    }),
  ),
});
export type SpecialtySetup = z.infer<typeof specialtySetupSchema>;

export function specialtyOptions(setup?: SpecialtySetup, current?: string) {
  const options = setup
    ? [
        ...setup.legacy.map((o) => ({ value: o.code, label: `${o.name} · Standard` })),
        ...setup.catalog
          .filter((o) => o.active && setup.selected.includes(o.code))
          .map((o) => ({ value: o.code, label: o.name })),
      ]
    : [
        { value: "other", label: "Other · Standard" },
        { value: "dentistry", label: "Dentistry · Standard" },
        { value: "general_medicine", label: "General medicine · Standard" },
      ];
  if (current && !options.some((o) => o.value === current))
    options.push({ value: current, label: `${specialtyName(current, setup)} · Existing only` });
  return options;
}

export function specialtyName(code: string, setup?: SpecialtySetup) {
  return (
    setup?.catalog.find((item) => item.code === code)?.name ??
    setup?.legacy.find((item) => item.code === code)?.name ??
    (
      { other: "Other", dentistry: "Dentistry", general_medicine: "General medicine" } as Record<
        string,
        string
      >
    )[code] ??
    code.replaceAll("_", " ")
  );
}
export function specialtyStatus(code: string, setup?: SpecialtySetup) {
  if (["other", "dentistry", "general_medicine"].includes(code)) return "Standard";
  if (!setup) return "Specialty settings unavailable";
  const enabled = setup.catalog.some(
    (item) => item.code === code && item.active && setup.selected.includes(code),
  );
  return enabled ? "Enabled for new templates" : "Existing templates only";
}

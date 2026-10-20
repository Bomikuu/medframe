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
        ...setup.legacy.map((o) => ({ value: o.code, label: o.name })),
        ...setup.catalog
          .filter((o) => o.active && setup.selected.includes(o.code))
          .map((o) => ({ value: o.code, label: o.name })),
      ]
    : [
        { value: "other", label: "Other" },
        { value: "dentistry", label: "Dentistry" },
        { value: "general_medicine", label: "General medicine" },
      ];
  if (current && !options.some((o) => o.value === current))
    options.push({ value: current, label: `${current.replaceAll("_", " ")} · Existing template` });
  return options;
}

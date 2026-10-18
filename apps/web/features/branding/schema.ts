import { z } from "zod";

export const themeSchema = z
  .object({
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    font: z.enum(["inter", "source_sans_3", "noto_sans"]),
    radius: z.enum(["square", "subtle", "rounded"]),
    density: z.enum(["comfortable", "compact"]),
    content_width: z.enum(["contained", "full"]),
    sidebar_width: z.number().int().min(224).max(280),
    heading_scale: z.enum(["small", "medium", "large"]),
    type_scale: z.enum(["standard", "large"]),
    header: z.enum(["standard", "compact"]),
    shadow: z.enum(["none", "subtle"]),
    input_style: z.enum(["outlined", "filled"]),
    button_style: z.enum(["solid", "outline"]),
    card_style: z.enum(["outlined", "flat"]),
    logo_id: z.string().nullable(),
  })
  .superRefine((value, context) => {
    if (!/^#[0-9a-f]{6}$/i.test(value.primary)) return;
    const channels = [1, 3, 5]
      .map((index) => parseInt(value.primary.slice(index, index + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    if (1.05 / (luminance + 0.05) < 4.5)
      context.addIssue({
        code: "custom",
        path: ["primary"],
        message: "Choose a darker primary color with readable white text.",
      });
  });
export const personalSchema = z.object({
  mode: z.enum(["light", "dark", "system"]),
  density: z.enum(["inherit", "comfortable", "compact"]),
  sidebar_collapsed: z.boolean(),
  avatar_id: z.string().nullable(),
});
export const widgetSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
  size: z.enum(["standard", "wide"]),
});
export const appearanceSchema = z.object({
  organization: z.object({ version: z.number(), settings: themeSchema }),
  personal: z.object({
    version: z.number(),
    settings: personalSchema,
    widgets: z.array(widgetSchema),
  }),
  defaults: z.object({
    organization: themeSchema,
    personal: personalSchema,
    widgets: z.array(widgetSchema),
  }),
});
export type Appearance = z.infer<typeof appearanceSchema>;
export type ThemeSettings = z.infer<typeof themeSchema>;
export type PersonalSettings = z.infer<typeof personalSchema>;

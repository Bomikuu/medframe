"use client";

import { WorkspaceLoading } from "@/components/application/workspace-loading";
import { RecordUnavailable } from "@/components/application/record-unavailable";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { AppearanceDocument } from "@/lib/graphql/generated";
import { useRemote } from "@/features/patients/use-remote";
import { LoadState } from "@/features/patients/feedback";
import {
  appearanceSchema,
  type Appearance,
  type ThemeSettings,
  type PersonalSettings,
} from "./schema";

type Theme = {
  appearance: Appearance;
  theme: ThemeSettings;
  personal: PersonalSettings;
  preview: (theme: ThemeSettings | null, personal: PersonalSettings | null) => void;
  accept: (value: unknown) => void;
};
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  organizationId,
  children,
}: {
  organizationId: string;
  children: ReactNode;
}) {
  const remote = useRemote(AppearanceDocument, { organizationId });
  if (!remote.data && !remote.error)
    return (
      <WorkspaceLoading
        title="Applying your preferences"
        detail="Preparing your clinic’s appearance and workspace settings."
        retry={remote.reload}
      />
    );
  if (!remote.data)
    return (
      <main className="p-8">
        <LoadState error={remote.error} retry={remote.reload} />
      </main>
    );
  const parsed = appearanceSchema.safeParse(remote.data.clinicAppearance);
  if (!parsed.success)
    return (
      <main id="main" className="grid min-h-svh place-items-center px-5 py-8">
        <RecordUnavailable
          compact={false}
          title="Workspace settings are unavailable"
          description="We couldn’t read the appearance settings for this clinic. Retry, or contact your clinic administrator if the problem continues."
          retry={remote.reload}
        />
      </main>
    );
  return (
    <EffectiveTheme key={organizationId} initial={parsed.data}>
      {children}
    </EffectiveTheme>
  );
}

function EffectiveTheme({ initial, children }: { initial: Appearance; children: ReactNode }) {
  const [appearance, setAppearance] = useState(initial);
  const [previewTheme, setPreviewTheme] = useState<ThemeSettings | null>(null);
  const [previewPersonal, setPreviewPersonal] = useState<PersonalSettings | null>(null);
  const preview = useCallback(
    (organization: ThemeSettings | null, preferences: PersonalSettings | null) => {
      setPreviewTheme(organization);
      setPreviewPersonal(preferences);
    },
    [],
  );
  const theme = previewTheme ?? appearance.organization.settings;
  const personal = previewPersonal ?? appearance.personal.settings;
  useAppearanceTokens(theme, personal);
  return (
    <ThemeContext.Provider
      value={{
        appearance,
        theme,
        personal,
        preview,
        accept: (value) => {
          setAppearance(appearanceSchema.parse(value));
          setPreviewTheme(null);
          setPreviewPersonal(null);
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider is required");
  return value;
}

export function useAppearanceTokens(
  theme: Omit<ThemeSettings, "logo_id">,
  personal: Pick<PersonalSettings, "mode" | "density">,
) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    let firstFrame = 0;
    let secondFrame = 0;
    const update = () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      root.dataset.themeChanging = "true";
      root.dataset.mode =
        personal.mode === "system" ? (media.matches ? "dark" : "light") : personal.mode;
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          delete root.dataset.themeChanging;
        });
      });
    };
    update();
    const variables: Record<string, string> = {
      "--brand-secondary": theme.secondary,
      "--clinic-primary": theme.primary,
      "--brand-teal": theme.accent,
      "--radius": { square: "0px", subtle: "8px", rounded: "12px" }[theme.radius],
      "--sidebar-width": `${theme.sidebar_width}px`,
      "--app-font": {
        medframe: "var(--font-jakarta), Arial, sans-serif",
        manrope: "var(--font-manrope), Arial, sans-serif",
        jakarta: "var(--font-jakarta), Arial, sans-serif",
        inter: '"Inter Variable", Arial, sans-serif',
        source_sans_3: '"Source Sans 3 Variable", Arial, sans-serif',
        noto_sans: '"Noto Sans Variable", Arial, sans-serif',
      }[theme.font],
      "--app-heading-font": {
        medframe: "var(--font-manrope), Arial, sans-serif",
        manrope: "var(--font-manrope), Arial, sans-serif",
        jakarta: "var(--font-jakarta), Arial, sans-serif",
        inter: '"Inter Variable", Arial, sans-serif',
        source_sans_3: '"Source Sans 3 Variable", Arial, sans-serif',
        noto_sans: '"Noto Sans Variable", Arial, sans-serif',
      }[theme.font],
      "--app-font-size": theme.type_scale === "large" ? "16px" : "15px",
      "--heading-scale": { small: "0.9", medium: "1", large: "1.1" }[theme.heading_scale],
    };
    Object.entries(variables).forEach(([key, value]) => root.style.setProperty(key, value));
    root.dataset.density = personal.density === "inherit" ? theme.density : personal.density;
    root.dataset.inputStyle = theme.input_style;
    root.dataset.buttonStyle = theme.button_style;
    root.dataset.cardStyle = theme.card_style;
    root.dataset.shadow = theme.shadow;
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      delete root.dataset.themeChanging;
      Object.keys(variables).forEach((key) => root.style.removeProperty(key));
      for (const key of ["mode", "density", "inputStyle", "buttonStyle", "cardStyle", "shadow"])
        delete root.dataset[key];
    };
  }, [theme, personal]);
}

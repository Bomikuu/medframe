"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/features/patients/form-controls";
import { PageHeading, failureText } from "@/features/patients/feedback";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useSafety, useUnsavedChanges } from "@/features/workspace/safety-provider";
import { usePatientDraft } from "@/features/patients/use-patient-draft";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { DocumentPanel } from "@/features/documents/document-panel";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  SaveBrandingDocument,
  SavePreferencesDocument,
  SaveDashboardDocument,
  AppearanceDocument,
} from "@/lib/graphql/generated";
import { useTheme } from "./theme-provider";
import {
  themeSchema,
  personalSchema,
  appearanceSchema,
  type Appearance,
  type ThemeSettings,
  type PersonalSettings,
} from "./schema";
import { ArrowUp, ArrowDown } from "@/components/icons";

const fontLabels: Record<string, string> = {
  medframe: "Medframe · Jakarta + Manrope",
  manrope: "Manrope",
  jakarta: "Plus Jakarta Sans",
  inter: "Inter (legacy)",
  source_sans_3: "Source Sans 3",
  noto_sans: "Noto Sans",
};
const label = (value: string) => fontLabels[value] ?? value.replaceAll("_", " ");
const options = (values: readonly string[]) =>
  values.map((value) => ({ value, label: label(value) }));

export function AppearancePage() {
  const { can } = useWorkspace();
  const { guard } = useSafety();
  const [scope, setScope] = useState("personal");
  const [pending, setPending] = useState(false);
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        title="Appearance"
        description="Preview changes in your workspace, then save. Personal preferences apply only to you in this clinic."
      />
      <Tabs
        value={scope}
        onValueChange={(value) => {
          if (!pending) void guard(() => setScope(value));
        }}
        className="min-w-0 gap-6"
      >
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" aria-label="Appearance scope" className="min-w-max">
            <TabsTrigger disabled={pending} value="personal">
              Your preferences
            </TabsTrigger>
            <TabsTrigger disabled={pending} value="dashboard">
              Dashboard layout
            </TabsTrigger>
            {can("organization.manage") && (
              <TabsTrigger disabled={pending} value="organization">
                Clinic branding
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent value="organization">
          {scope === "organization" && <OrganizationAppearance setPending={setPending} />}
        </TabsContent>
        <TabsContent value="personal">
          {scope === "personal" && <PersonalAppearance setPending={setPending} />}
        </TabsContent>
        <TabsContent value="dashboard">
          {scope === "dashboard" && <DashboardLayout setPending={setPending} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrganizationAppearance({ setPending }: { setPending: (value: boolean) => void }) {
  const { organizationId } = useWorkspace();
  const { appearance, preview, accept } = useTheme();
  const capture = useRequestScope();
  useEffect(() => () => setPending(false), [setPending]);
  const form = useForm<ThemeSettings>({
    resolver: zodResolver(themeSchema),
    defaultValues: appearance.organization.settings,
  });
  const values = useWatch({ control: form.control });
  const serializedValues = JSON.stringify(values);
  const [failure, setFailure] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const key = `${organizationId}:branding`;
  usePatientDraft(key, form);
  useUnsavedChanges(key, form.formState.isDirty, () => {
    form.reset(appearance.organization.settings);
    preview(null, null);
  });
  useEffect(() => {
    const parsed = themeSchema.safeParse(JSON.parse(serializedValues));
    if (parsed.success) preview(parsed.data, null);
    return () => preview(null, null);
  }, [serializedValues, preview]); // preview uses the same structured settings as persistence
  const choice = (
    name: Exclude<keyof ThemeSettings, "sidebar_width" | "logo_id">,
    title: string,
    choices: string[],
  ) => (
    <FormSelect
      id={`theme-${name}`}
      label={title}
      value={String(values[name])}
      onChange={(value) =>
        form.setValue(name, value as ThemeSettings[typeof name], { shouldDirty: true })
      }
      options={options(choices)}
    />
  );
  return (
    <section className="grid min-w-0 gap-6">
      <h2 className="text-xl font-semibold">Clinic branding</h2>
      <form
        noValidate
        className="grid min-w-0 gap-6"
        onSubmit={form.handleSubmit(async (settings) => {
          setPending(true);
          const isCurrent = capture();
          setFailure(null);
          setMessage("");
          try {
            const result = await getGraphqlClient().request(SaveBrandingDocument, {
              organizationId,
              settings,
              expectedVersion: appearance.organization.version,
            });
            if (isCurrent()) {
              accept(result.updateOrganizationBranding);
              form.reset(settings);
              setMessage("Clinic appearance saved.");
            }
          } catch (error) {
            if (isCurrent()) setFailure(error);
          } finally {
            if (isCurrent()) setPending(false);
          }
        })}
      >
        <div className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <FormField
            id="theme-primary"
            label="Primary action color"
            hint="Use a dark color that keeps white labels readable."
            error={form.formState.errors.primary?.message}
          >
            <Input
              id="theme-primary"
              {...form.register("primary")}
              maxLength={7}
              aria-invalid={!!form.formState.errors.primary}
              aria-describedby="theme-primary-help"
            />
          </FormField>
          <FormField id="theme-accent" label="Accent color">
            <Input id="theme-accent" {...form.register("accent")} maxLength={7} />
          </FormField>
          {choice("font", "Font family", [
            "medframe",
            "manrope",
            "jakarta",
            "inter",
            "source_sans_3",
            "noto_sans",
          ])}
          {choice("radius", "Corner radius", ["square", "subtle", "rounded"])}
          {choice("density", "Default density", ["comfortable", "compact"])}
          {choice("content_width", "Content width", ["contained", "full"])}
          {choice("heading_scale", "Heading size", ["small", "medium", "large"])}
          {choice("type_scale", "Body text size", ["standard", "large"])}
          {choice("header", "Header", ["standard", "compact"])}
          {choice("shadow", "Panel shadows", ["none", "subtle"])}
          {choice("input_style", "Input style", ["outlined", "filled"])}
          {choice("button_style", "Button style", ["solid", "outline"])}
          {choice("card_style", "Panel style", ["outlined", "flat"])}
          <FormField id="sidebarWidth" label="Sidebar width" hint="224–280 pixels">
            <Input
              id="sidebarWidth"
              type="number"
              min={224}
              max={280}
              {...form.register("sidebar_width", { valueAsNumber: true })}
              className="max-w-40"
            />
          </FormField>
        </div>
        {failure !== null && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(failure)}
          </p>
        )}
        {message && !form.formState.isDirty && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.formState.isSubmitting}>Save clinic appearance</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset(appearance.organization.settings);
              preview(null, null);
            }}
          >
            Cancel preview
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              form.reset(appearance.defaults.organization, { keepDefaultValues: true })
            }
          >
            Preview defaults
          </Button>
        </div>
      </form>
      {failure !== null && (
        <AppearanceRecovery
          onLoaded={(latest) => {
            form.reset(latest.organization.settings);
            setFailure(null);
          }}
        />
      )}
      <DocumentPanel
        purpose="logo"
        attachedIds={values.logo_id ? [values.logo_id] : []}
        onAttach={(id, attach) =>
          form.setValue("logo_id", attach ? id : null, { shouldDirty: true })
        }
      />
    </section>
  );
}

function PersonalAppearance({ setPending }: { setPending: (value: boolean) => void }) {
  const { organizationId } = useWorkspace();
  const { appearance, preview, accept } = useTheme();
  const capture = useRequestScope();
  useEffect(() => () => setPending(false), [setPending]);
  const form = useForm<PersonalSettings>({ defaultValues: appearance.personal.settings });
  const values = useWatch({ control: form.control });
  const serializedValues = JSON.stringify(values);
  const [failure, setFailure] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  usePatientDraft(`${organizationId}:personal-appearance`, form);
  useUnsavedChanges(`${organizationId}:personal-appearance`, form.formState.isDirty, () => {
    form.reset(appearance.personal.settings);
    preview(null, null);
  });
  useEffect(() => {
    const parsed = personalSchema.safeParse(JSON.parse(serializedValues));
    if (parsed.success) preview(null, parsed.data);
    return () => preview(null, null);
  }, [serializedValues, preview]);
  return (
    <section className="grid min-w-0 gap-6">
      <h2 className="text-xl font-semibold">Your preferences</h2>
      <form
        noValidate
        className="grid min-w-0 gap-6"
        onSubmit={form.handleSubmit(async (settings) => {
          setPending(true);
          setMessage("");
          const isCurrent = capture();
          setFailure(null);
          try {
            const result = await getGraphqlClient().request(SavePreferencesDocument, {
              organizationId,
              settings,
              expectedVersion: appearance.personal.version,
            });
            if (isCurrent()) {
              accept(result.updateUserPreferences);
              form.reset(settings);
              setMessage("Your appearance preferences are saved.");
            }
          } catch (error) {
            if (isCurrent()) setFailure(error);
          } finally {
            if (isCurrent()) setPending(false);
          }
        })}
      >
        <div className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <FormSelect
            id="personal-mode"
            label="Color mode"
            value={values.mode ?? "light"}
            onChange={(value) =>
              form.setValue("mode", value as PersonalSettings["mode"], { shouldDirty: true })
            }
            options={options(["light", "dark", "system"])}
          />
          <FormSelect
            id="personal-density"
            label="Density"
            value={values.density ?? "inherit"}
            onChange={(value) =>
              form.setValue("density", value as PersonalSettings["density"], { shouldDirty: true })
            }
            options={options(["inherit", "comfortable", "compact"])}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <Switch
            checked={values.sidebar_collapsed ?? false}
            onCheckedChange={(checked) =>
              form.setValue("sidebar_collapsed", checked, { shouldDirty: true })
            }
          />
          Collapse sidebar
        </label>
        {failure !== null && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(failure)}
          </p>
        )}
        {message && !form.formState.isDirty && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.formState.isSubmitting}>Save preferences</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset(appearance.personal.settings);
              preview(null, null);
            }}
          >
            Cancel preview
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => form.reset(appearance.defaults.personal, { keepDefaultValues: true })}
          >
            Preview defaults
          </Button>
        </div>
      </form>
      {failure !== null && (
        <AppearanceRecovery
          onLoaded={(latest) => {
            form.reset(latest.personal.settings);
            setFailure(null);
          }}
        />
      )}
      <DocumentPanel
        purpose="avatar"
        attachedIds={values.avatar_id ? [values.avatar_id] : []}
        onAttach={(id, attach) =>
          form.setValue("avatar_id", attach ? id : null, { shouldDirty: true })
        }
      />
    </section>
  );
}

function DashboardLayout({ setPending }: { setPending: (value: boolean) => void }) {
  const { organizationId } = useWorkspace();
  const { appearance, accept } = useTheme();
  const capture = useRequestScope();
  useEffect(() => () => setPending(false), [setPending]);
  const form = useForm({ defaultValues: { widgets: appearance.personal.widgets } });
  const values = useWatch({ control: form.control, name: "widgets" });
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  usePatientDraft(`${organizationId}:dashboard-layout`, form);
  useUnsavedChanges(`${organizationId}:dashboard-layout`, form.formState.isDirty, () =>
    form.reset(),
  );
  function move(index: number, offset: number) {
    const updated = [...form.getValues("widgets")];
    [updated[index], updated[index + offset]] = [updated[index + offset], updated[index]];
    form.setValue("widgets", updated, { shouldDirty: true });
  }
  return (
    <section className="grid gap-5 border-t border-border pt-8">
      <h2 className="text-xl font-semibold">Dashboard layout</h2>
      <form
        noValidate
        className="grid gap-5"
        onSubmit={form.handleSubmit(async ({ widgets }) => {
          setPending(true);
          const isCurrent = capture();
          setError(null);
          setSaved(false);
          try {
            const result = await getGraphqlClient().request(SaveDashboardDocument, {
              organizationId,
              widgets,
              expectedVersion: appearance.personal.version,
            });
            if (isCurrent()) {
              accept(result.saveDashboardLayout);
              form.reset({ widgets });
              setSaved(true);
            }
          } catch (failure) {
            if (isCurrent()) setError(failure);
          } finally {
            if (isCurrent()) setPending(false);
          }
        })}
      >
        <ul className="grid gap-2">
          {values.map((widget, index) => (
            <li
              key={widget.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
            >
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Switch
                  checked={widget.visible}
                  onCheckedChange={(checked) =>
                    form.setValue(`widgets.${index}.visible`, checked, { shouldDirty: true })
                  }
                />
                {label(widget.id)}
              </label>
              <div className="w-40">
                <FormSelect
                  id={`widget-size-${widget.id}`}
                  label="Widget width"
                  value={widget.size ?? "standard"}
                  onChange={(value) =>
                    form.setValue(`widgets.${index}.size`, value as "standard" | "wide", {
                      shouldDirty: true,
                    })
                  }
                  options={[
                    { value: "standard", label: "Standard" },
                    { value: "wide", label: "Full width" },
                  ]}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === 0}
                  aria-label={`Move ${label(widget.id)} up`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === values.length - 1}
                  aria-label={`Move ${label(widget.id)} down`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {error !== null && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(error)}
          </p>
        )}
        {saved && !form.formState.isDirty && (
          <p role="status" className="text-sm">
            Dashboard layout saved.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button disabled={form.formState.isSubmitting}>Save dashboard layout</Button>
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancel changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              form.setValue("widgets", appearance.defaults.widgets, { shouldDirty: true })
            }
          >
            Preview default layout
          </Button>
        </div>
      </form>
      {error !== null && (
        <AppearanceRecovery
          onLoaded={(latest) => {
            form.reset({ widgets: latest.personal.widgets });
            setError(null);
          }}
        />
      )}
    </section>
  );
}

function AppearanceRecovery({ onLoaded }: { onLoaded: (appearance: Appearance) => void }) {
  const { organizationId } = useWorkspace();
  const { accept } = useTheme();
  const { confirm } = useSafety();
  const capture = useRequestScope();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="grid justify-items-start gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          const isCurrent = capture();
          if (
            !(await confirm({
              title: "Load the latest appearance settings?",
              description:
                "Your unsaved preview will be replaced by the saved settings. Review them before editing again.",
              action: "Load latest",
            }))
          )
            return;
          setBusy(true);
          setFailed(false);
          try {
            const result = await getGraphqlClient().request(AppearanceDocument, { organizationId });
            if (isCurrent()) {
              const appearance = appearanceSchema.parse(result.clinicAppearance);
              accept(appearance);
              onLoaded(appearance);
            }
          } catch {
            if (isCurrent()) setFailed(true);
          } finally {
            if (isCurrent()) setBusy(false);
          }
        }}
      >
        Load latest saved settings
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Could not load settings. Your preview is still here; try again.
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { requestWithCsrf, getCsrfToken, errorMessage, ApiError } from "@/lib/auth/client";

export type AccessSettings = {
  roles: string[];
  branch_id: string | null;
  workspace_mode: "full" | "station";
  billing_access: "inherit" | "none" | "view" | "record" | "manage";
  specialty: string;
  professional_title: string;
};
export type StaffMember = AccessSettings & {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  account_active: boolean;
  branch: string;
  permissions: string[];
  version: number;
  photo_id: string | null;
  provider_readiness?: { profile: boolean; specialty: boolean; scheduled: boolean };
};
export type StaffInvite = {
  id: string;
  email: string;
  branch: string;
  roles: string[];
  state: string;
  version: number;
  expires_at: string;
};
export type StaffSnapshot = {
  role_permissions: Record<string, string[]>;
  readiness: {
    email_mode: "local_capture" | "smtp_configured";
    local_inbox: string | null;
    registration_sms_configured: boolean;
    reminder_sms_enabled: boolean;
    calls: { profile: "internet" | "loopback"; secure_origin: boolean };
  };
  members: StaffMember[];
  invitations: StaffInvite[];
  actor_id: string;
  branch_restricted: boolean;
  limit: number;
  branches: { id: string; name: string }[];
  specialties: { code: string; name: string }[];
  roles: string[];
};
export type JoinSnapshot = {
  permissions: string[];
  clinic: string;
  branch: string;
  email_hint: string;
  verified: boolean;
  expires_at: string;
  organization_id: string;
  roles: string[];
  settings: Omit<AccessSettings, "roles" | "branch_id">;
  email?: string;
  progress?: { display_name?: string; phone?: string };
  photo_id?: string | null;
  has_account?: boolean;
  signed_in?: boolean;
};
const roleLabels: Record<string, string> = {
  clinic_administrator: "Clinic administrator",
  doctor: "Doctor",
  dentist: "Dentist",
  nurse: "Nurse",
  receptionist: "Receptionist",
};
export const roleLabel = (role: string) => roleLabels[role] ?? role.replaceAll("_", " ");
export const staffRequest = <T>(body: unknown, signal?: AbortSignal) =>
  requestWithCsrf<T>("staff/manage", body, { signal });
export const joinRequest = <T>(token: string, action: string, body: Record<string, unknown> = {}) =>
  requestWithCsrf<T>("staff/onboarding", { token, action, ...body });

export async function uploadStaffPhoto(file: File, fields: Record<string, string>) {
  if (file.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP photo up to 2 MiB.");
  const form = new FormData();
  form.set("file", file);
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const response = await fetch("/api/backend/staff/photo/upload", {
    method: "POST",
    headers: { "X-CSRF-Token": await getCsrfToken() },
    body: form,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message ?? "Photo upload failed. Your existing photo was kept.");
  return data as { photo_id: string; version: number | null };
}

export function useStaff(organizationId: string, enabled: boolean) {
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<{
    organization: string;
    data: StaffSnapshot | null;
    error: string;
  }>({ organization: "", data: null, error: "" });
  const reload = useCallback(() => setGeneration((g) => g + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let live = true;
    staffRequest<StaffSnapshot>({ organization_id: organizationId }, controller.signal)
      .then((data) => {
        if (live) setState({ organization: organizationId, data, error: "" });
      })
      .catch((error) => {
        if (live)
          setState((old) => ({
            organization: organizationId,
            data:
              old.organization === organizationId &&
              !(error instanceof ApiError && [401, 403, 404].includes(error.status))
                ? old.data
                : null,
            error: errorMessage(error),
          }));
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [organizationId, enabled, generation]);
  return {
    data: state.organization === organizationId ? state.data : null,
    error: state.organization === organizationId ? state.error : "",
    reload,
  };
}

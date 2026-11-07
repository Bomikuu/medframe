"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientAvatar } from "@/components/application/patient-avatar";
import { SecureImage } from "@/features/documents/secure-image";
import { UploadControl } from "@/features/documents/upload-control";
import { useTheme } from "@/features/branding/theme-provider";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { useRequestScope } from "@/features/patients/use-request-scope";
import { useRemote } from "@/features/patients/use-remote";
import { useUnsavedChanges } from "@/features/workspace/safety-provider";
import { getGraphqlClient } from "@/lib/graphql/client";
import {
  AppearanceDocument,
  PatientDocumentsDocument,
  SavePreferencesDocument,
} from "@/lib/graphql/generated";
import { errorMessage } from "@/lib/auth/client";

export function AccountPhoto() {
  const { organizationId, overview } = useWorkspace();
  const { appearance, accept } = useTheme();
  const capture = useRequestScope();
  const [pending, setPending] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paused, setPaused] = useState(false);
  const saving = useRef(false);
  const attempted = useRef<string | null>(null);
  const photoId = appearance.personal.settings.avatar_id;
  useUnsavedChanges("account-photo", uploading || !!pending || busy, () => {
    setPending(null);
    setUploading(false);
  });
  const remote = useRemote(
    PatientDocumentsDocument,
    { organizationId, purpose: "avatar", versionIds: pending ? [pending] : [] },
    { enabled: !!pending, refreshOnFocus: false },
  );
  const file = [...(remote.data?.documentVersions ?? []), ...(remote.data?.documents ?? [])].find(
    (item) => item.id === pending,
  );

  async function save(id: string | null) {
    if (saving.current) return;
    saving.current = true;
    const current = capture();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await getGraphqlClient().request(SavePreferencesDocument, {
        organizationId,
        settings: { ...appearance.personal.settings, avatar_id: id },
        expectedVersion: appearance.personal.version,
      });
      if (current()) {
        accept(result.updateUserPreferences);
        setPending(null);
        setNotice(id ? "Your profile photo is saved." : "Your profile photo was removed.");
      }
    } catch (cause) {
      if (current()) setError(errorMessage(cause));
    } finally {
      saving.current = false;
      if (current()) setBusy(false);
    }
  }

  useEffect(() => {
    if (!pending) return;
    setPaused(false);
    const interval = window.setInterval(remote.reload, 4000);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setPaused(true);
    }, 60000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [pending, remote.reload]);
  useEffect(() => {
    if (file?.scanState === "clean" && pending && attempted.current !== pending) {
      attempted.current = pending;
      void save(pending);
    }
    // Each uploaded version is automatically selected once, after its native scan succeeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, file?.scanState]);

  const fallback = (
    <PatientAvatar name={overview.currentUser.displayName} className="size-24 border-0" />
  );
  return (
    <div className="grid min-w-0 gap-3">
      <UploadControl
        purpose="avatar"
        profileImage
        initialLabel="Account profile photo"
        disabled={busy || !!pending}
        avatarFallback={
          photoId ? (
            <SecureImage
              id={photoId}
              avatar
              alt="Your profile photo"
              className="size-24"
              fallback={fallback}
            />
          ) : (
            fallback
          )
        }
        onPendingChange={setUploading}
        onUploaded={(id) => {
          if (id) {
            attempted.current = null;
            setError("");
            setPending(id);
          }
        }}
      />
      {photoId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy || uploading || !!pending}
          onClick={() => void save(null)}
        >
          <Trash2 aria-hidden className="size-4" />
          Remove photo
        </Button>
      )}
      {pending && (
        <p role="status" className="text-xs leading-5 text-muted-foreground">
          {file?.scanState === "clean"
            ? "Photo checked. Saving your profile image."
            : paused
              ? "Your photo is still being checked. You can check its status again."
              : file && !["pending", "unavailable"].includes(file.scanState)
                ? "This photo did not pass its security scan. Choose another image."
                : "Checking your uploaded photo. It will become your profile image automatically."}
        </p>
      )}
      {(error || remote.error) && (
        <p role="alert" className="text-xs leading-5 text-destructive">
          {error || errorMessage(remote.error)}
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs leading-5 text-teal-ink">
          {notice}
        </p>
      )}
      {pending &&
        (paused ||
          error ||
          remote.error ||
          (file && !["clean", "pending", "unavailable"].includes(file.scanState))) && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (file?.scanState === "clean") {
                  try {
                    const latest = await getGraphqlClient().request(AppearanceDocument, {
                      organizationId,
                    });
                    accept(latest.clinicAppearance);
                    setError("");
                    setNotice("Latest preferences loaded. Choose Save photo to apply this image.");
                  } catch (cause) {
                    setError(errorMessage(cause));
                  }
                } else remote.reload();
              }}
            >
              <RefreshCw aria-hidden className="size-4" />
              {file?.scanState === "clean" ? "Reload preferences" : "Check photo"}
            </Button>
            {file?.scanState === "clean" && (
              <Button type="button" size="sm" disabled={busy} onClick={() => void save(pending)}>
                Save photo
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setPending(null);
                setError("");
              }}
            >
              Cancel photo
            </Button>
          </div>
        )}
    </div>
  );
}

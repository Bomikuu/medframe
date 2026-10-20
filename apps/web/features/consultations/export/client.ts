import { ApiError, getCsrfToken } from "@/lib/auth/client";

export async function downloadFile(path: string, body: unknown, filename: string) {
  const response = await fetch(`/api/backend/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": await getCsrfToken() },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(
      error.message ?? "Download unavailable. Try again.",
      error.code,
      response.status,
    );
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

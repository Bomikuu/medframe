"use client";

import { useEffect, useState } from "react";

export function PublicQueue({
  slug,
  initial,
  preview,
}: {
  slug: string;
  initial: { number: number; status: string }[];
  preview: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (preview) return;
    let active = true;
    const refresh = () =>
      void fetch(`/clinics/${slug}/queue`, { cache: "no-store", signal: AbortSignal.timeout(8000) })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          const value = await response.json();
          if (active) {
            setRows(value.queue);
            setUnavailable(false);
          }
        })
        .catch(() => {
          if (active) {
            setRows([]);
            setUnavailable(true);
          }
        });
    const timer = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [slug, preview]);
  return (
    <div className="mt-6">
      <p className="text-sm leading-6">
        Ticket numbers only. Check with reception for your service and room. This display does not
        confirm an appointment.
      </p>
      {rows.length ? (
        <ul className="mt-5 flex flex-wrap gap-3">
          {rows.map((row) => (
            <li key={row.number} className="rounded-lg bg-[var(--site-wash)] px-5 py-4 font-sans">
              <strong className="block text-2xl">{row.number}</strong>
              <span className="text-xs capitalize">{row.status.replaceAll("_", " ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm">
          {preview
            ? "Live queue numbers appear here after publication when a branch is selected."
            : unavailable
              ? "Queue temporarily unavailable. Please ask reception."
              : "No current queue numbers to display."}
        </p>
      )}
      <p className="mt-4 text-xs">{preview ? "Preview only" : "Updates every 30 seconds"}</p>
    </div>
  );
}

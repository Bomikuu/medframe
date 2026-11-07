"use client";

import { useRouter } from "next/navigation";
import { LoadState } from "@/features/patients/feedback";

/** One loading presentation for both an accepted sidebar click and a streamed clinic route. */
export function ClinicPageLoading({
  destination,
  retry,
}: {
  destination?: string;
  retry?: () => void;
}) {
  const router = useRouter();
  return (
    <LoadState
      error={null}
      retry={retry ?? (() => router.refresh())}
      title={destination ? `Opening ${destination}` : undefined}
      detail="Preparing this page. Your clinic and branch stay selected."
    />
  );
}

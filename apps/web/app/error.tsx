"use client";

import { UnexpectedError } from "@/components/application/unexpected-error";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <UnexpectedError retry={retry} />;
}

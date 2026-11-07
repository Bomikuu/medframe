"use client";

import "./globals.css";
import { UnexpectedError } from "@/components/application/unexpected-error";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="font-[Arial,sans-serif]">
        <UnexpectedError retry={retry} />
      </body>
    </html>
  );
}

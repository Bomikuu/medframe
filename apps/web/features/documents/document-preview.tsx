"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { useRequestScope } from "@/features/patients/use-request-scope";

export function DocumentPreview({
  label,
  contentType,
  authorize,
}: {
  label: string;
  contentType: string;
  authorize: () => Promise<string>;
}) {
  const [state, setState] = useState<{ bytes: Uint8Array; url: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const capture = useRequestScope();
  const transfer = useRef<AbortController | null>(null);
  useEffect(() => () => transfer.current?.abort(), []);
  useEffect(
    () => () => {
      if (state) URL.revokeObjectURL(state.url);
    },
    [state],
  );
  async function load() {
    if (busy) return;
    const current = capture();
    transfer.current?.abort();
    const controller = new AbortController();
    transfer.current = controller;
    setBusy(true);
    setError("");
    setOpen(true);
    setState(null);
    try {
      const url = await authorize();
      if (!current() || controller.signal.aborted) return;
      const parsed = new URL(url, window.location.origin);
      if (
        parsed.origin !== window.location.origin ||
        !["/api/backend/documents/download", "/api/backend/portal/documents/download"].includes(
          parsed.pathname,
        )
      )
        throw new Error("Invalid transfer");
      const response = await fetch(parsed, { cache: "no-store", signal: controller.signal });
      if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== contentType)
        throw new Error("File unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 20 * 1024 * 1024) throw new Error("File too large");
      if (current() && !controller.signal.aborted)
        setState({ bytes, url: URL.createObjectURL(new Blob([bytes], { type: contentType })) });
    } catch {
      if (current() && !controller.signal.aborted)
        setError("Preview unavailable. Request a new download or contact your clinic.");
    } finally {
      if (current() && !controller.signal.aborted) setBusy(false);
    }
  }
  async function download() {
    const current = capture();
    setError("");
    setBusy(true);
    try {
      const url = await authorize();
      if (current()) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "";
        anchor.click();
      }
    } catch {
      if (current()) setError("Download unavailable. Your access may have changed.");
    } finally {
      if (current()) setBusy(false);
    }
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          aria-label={`Preview ${label}`}
          onClick={() => void load()}
        >
          Preview file
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void download()}>
          Download
        </Button>
        {open && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              transfer.current?.abort();
              setBusy(false);
              setState(null);
              setOpen(false);
            }}
          >
            Close preview
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {open && busy && <p role="status">Loading authorized file…</p>}
      {open &&
        state &&
        (contentType === "application/pdf" ? (
          <PdfPreview key={state.url} bytes={state.bytes} />
        ) : (
          <Image
            src={state.url}
            alt={label}
            width={1600}
            height={1200}
            unoptimized
            className="h-auto max-h-[70vh] w-auto max-w-full object-contain"
          />
        ))}
    </div>
  );
}
function PdfPreview({ bytes }: { bytes: Uint8Array }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [rendering, setRendering] = useState(false);
  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    void import("pdfjs-dist")
      .then((pdf) => {
        if (!active) return;
        pdf.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker-6.4.299.min.mjs";
        task = pdf.getDocument({
          data: bytes.slice(),
          enableXfa: false,
          useWorkerFetch: false,
          standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
          cMapUrl: "/vendor/pdfjs/cmaps/",
          cMapPacked: true,
          useWasm: false,
          useSystemFonts: false,
          disableFontFace: true,
          stopAtErrors: true,
          maxImageSize: 16 * 1024 * 1024,
        });
        task.onPassword = () => {
          if (active)
            setError("This PDF requires a password. Download it to open with a trusted reader.");
          void task?.destroy();
        };
        return task.promise;
      })
      .then((value) => {
        if (active && value) setDocument(value);
      })
      .catch(() => {
        if (active) setError("PDF preview could not be rendered. Download the original file.");
      });
    return () => {
      active = false;
      void task?.destroy();
    };
  }, [bytes]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let active = true;
    let render: ReturnType<import("pdfjs-dist").PDFPageProxy["render"]> | undefined;
    let loaded: import("pdfjs-dist").PDFPageProxy | undefined;
    const target = canvas.current;
    setRendering(true);
    setText("");
    void document
      .getPage(page)
      .then(async (value) => {
        if (!active) {
          value.cleanup();
          return;
        }
        loaded = value;
        const base = value.getViewport({ scale: 1 });
        const scale = Math.min(
          1.5,
          4096 / Math.max(base.width, base.height),
          Math.sqrt((16 * 1024 * 1024) / (base.width * base.height)),
        );
        const viewport = value.getViewport({ scale });
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        render = value.render({ canvas: target, viewport, annotationMode: 0 });
        await render.promise;
        const content = await value.getTextContent();
        if (active) {
          setText(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
          setRendering(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("This page could not be rendered. Download the original PDF.");
          setRendering(false);
        }
      });
    return () => {
      active = false;
      render?.cancel();
      loaded?.cleanup();
      target.width = 0;
      target.height = 0;
    };
  }, [document, page]);
  return (
    <div
      className="grid gap-3 rounded-lg border border-border p-4"
      aria-label="Private PDF preview"
    >
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={rendering || page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous page
            </Button>
            <p role="status">
              Page {page} of {document?.numPages ?? "…"}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={rendering || !document || page >= document.numPages}
              onClick={() => setPage(page + 1)}
            >
              Next page
            </Button>
          </div>
          <canvas ref={canvas} aria-label={`PDF page ${page}`} className="h-auto max-w-full" />
          <details>
            <summary className="min-h-11 text-sm">Accessible page text</summary>
            <p className="max-w-prose text-sm leading-6 whitespace-pre-wrap">
              {text ||
                "No extractable text on this page. Download the original document for another reader."}
            </p>
          </details>
          <p className="text-xs text-muted-foreground">
            Read-only page preview. Interactive forms, scripts, attachments, and links are not
            opened.
          </p>
        </>
      )}
    </div>
  );
}

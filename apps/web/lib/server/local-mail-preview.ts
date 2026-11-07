/** Only expose the captured mail inbox on the native localhost development runtime. */
export function localMailPreviewUrl() {
  if (process.env.NODE_ENV !== "development") return undefined;
  if (!["127.0.0.1", "localhost", "mail"].includes(process.env.SMTP_HOST ?? "")) return undefined;
  if (!["51025", "1025"].includes(process.env.SMTP_PORT ?? "")) return undefined;
  try {
    const origin = new URL(process.env.WEB_ORIGIN ?? "http://localhost:3000");
    return ["localhost", "127.0.0.1"].includes(origin.hostname)
      ? "http://localhost:58025"
      : undefined;
  } catch {
    return undefined;
  }
}

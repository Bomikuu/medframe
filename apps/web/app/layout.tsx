import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medframe | Clinical workspace",
  description: "The Foundation of Modern Care.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-20 focus:rounded-lg focus:bg-background focus:p-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

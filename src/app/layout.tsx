import type { Metadata, Viewport } from "next";
import { Heebo, Sora, Inter } from "next/font/google";
import { strings } from "@/lib/strings";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const hebrewFont = Heebo({
  variable: "--font-hebrew",
  subsets: ["hebrew", "latin"],
});

// Sora/Inter don't cover Hebrew glyphs — used only where the redesign shows
// genuinely LTR content (kcal/macro numerals, dates in an LTR format), never
// for Hebrew copy, which stays on Heebo. See globals.css for how these are
// wired as --font-display (Sora) / --font-numeric (Inter).
const displayFont = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const numericFont = Inter({
  variable: "--font-numeric",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: strings.common.appName,
  // iOS home-screen install: open without Safari's chrome, titled like the app.
  appleWebApp: { capable: true, title: strings.common.appName, statusBarStyle: "default" },
};

// The browser/status-bar colour; the app's own --background token.
export const viewport: Viewport = {
  themeColor: "#fdf9f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`h-full antialiased ${hebrewFont.variable} ${displayFont.variable} ${numericFont.variable}`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

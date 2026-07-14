import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { strings } from "@/lib/strings";
import "./globals.css";

const hebrewFont = Heebo({
  variable: "--font-hebrew",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: strings.common.appName,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${hebrewFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

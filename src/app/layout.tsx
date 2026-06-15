import type { Metadata } from "next";
import "./globals.css";

// Static font fallbacks to bypass Next.js external Google Fonts network calls in offline/restricted docker environments
const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "ParabellumPOS | Système de Caisse",
  description: "Système de point de vente (POS) hors-ligne pour la restauration rapide.",
  manifest: "/manifest.json",
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

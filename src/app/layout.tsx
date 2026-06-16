import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Static font fallbacks to bypass Next.js external Google Fonts network calls in offline/restricted docker environments
const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "ParabellumPOS | Système de Caisse",
  description: "Parabellum POS, caisse et e-commerce pour les restaurants et réseaux multi-sites.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.ico" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.ico",
  },
};

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
      <body className="barab-theme min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

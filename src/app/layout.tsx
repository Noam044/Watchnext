import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Watchnext", template: "%s · Watchnext" },
  description: "Des recommandations de films taillées pour tes goûts Letterboxd.",
};

export const viewport: Viewport = { themeColor: "#09090b" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${display.variable} h-full antialiased`}>
      <body className="relative flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}

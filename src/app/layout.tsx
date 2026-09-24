import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Courier_Prime, Hanken_Grotesk } from "next/font/google";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const shoulders = Big_Shoulders({ variable: "--font-shoulders", subsets: ["latin"], axes: ["opsz"] });
const courier = Courier_Prime({ variable: "--font-courier", subsets: ["latin"], weight: ["400", "700"] });

const description = "Watchnext lit tes notes Letterboxd et te propose des films qui te ressemblent, chacun avec sa raison.";

export const metadata: Metadata = {
  title: { default: "Watchnext", template: "%s · Watchnext" },
  description,
  applicationName: "Watchnext",
  openGraph: { type: "website", locale: "fr_FR", siteName: "Watchnext", title: "Watchnext", description },
  twitter: { card: "summary", title: "Watchnext", description },
};

export const viewport: Viewport = { themeColor: "#120809" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${hanken.variable} ${shoulders.variable} ${courier.variable} h-full antialiased`}>
      <body className="relative flex min-h-full flex-col font-sans">
        <a
          href="#contenu"
          className="btn-primary fixed top-3 left-3 z-[60] -translate-y-20 focus-visible:translate-y-0"
        >
          Aller au contenu
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Courier_Prime, Hanken_Grotesk } from "next/font/google";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const shoulders = Big_Shoulders({ variable: "--font-shoulders", subsets: ["latin"], axes: ["opsz"] });
const courier = Courier_Prime({ variable: "--font-courier", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: "Watchnext", template: "%s · Watchnext" },
  description: "Des recommandations de films taillées pour tes goûts Letterboxd.",
};

export const viewport: Viewport = { themeColor: "#120809" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${hanken.variable} ${shoulders.variable} ${courier.variable} h-full antialiased`}>
      <body className="relative flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Courier_Prime, Hanken_Grotesk } from "next/font/google";
import { Toaster } from "@/components/toaster";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const shoulders = Big_Shoulders({ variable: "--font-shoulders", subsets: ["latin"], axes: ["opsz"] });
const courier = Courier_Prime({ variable: "--font-courier", subsets: ["latin"], weight: ["400", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const description = t.common.appDescription;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "Watchnext", template: "%s · Watchnext" },
    appleWebApp: { capable: true, title: "Watchnext", statusBarStyle: "black-translucent" },
    icons: { apple: "/pwa-icon/180" },
    description,
    applicationName: "Watchnext",
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      siteName: "Watchnext",
      title: "Watchnext",
      description,
    },
    twitter: { card: "summary_large_image", title: "Watchnext", description },
  };
}

// « cover » : la page s'étend sous l'encoche et la barre d'accueil de l'iPhone (surtout en app installée,
// où la barre d'état est translucide) ; les en-têtes et barres fixes s'en écartent avec env(safe-area-inset-*).
export const viewport: Viewport = { themeColor: "#120809", viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={`${hanken.variable} ${shoulders.variable} ${courier.variable} h-full antialiased`}>
      <body className="relative flex min-h-full flex-col font-sans">
        <I18nProvider locale={locale}>
          <a
            href="#contenu"
            className="btn-primary fixed top-3 left-3 z-[60] -translate-y-20 focus-visible:translate-y-0"
          >
            {t.common.skipToContent}
          </a>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}

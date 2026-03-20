import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/lib/auth-context";
import { ReactQueryProvider } from "@/lib/react-query";
import { PromoBanner } from "@/components/layout/promo-banner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { clashDisplay, satoshi, ibmPlexSansArabic } from "@/lib/fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "ar" | "en")) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${satoshi.variable} ${clashDisplay.variable} ${ibmPlexSansArabic.variable} font-body antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ReactQueryProvider>
              <PromoBanner />
              <Header />
              <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
              <Footer />
              <MobileNav />
            </ReactQueryProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

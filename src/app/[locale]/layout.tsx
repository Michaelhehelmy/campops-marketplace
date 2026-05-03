import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/request";

export const metadata: Metadata = {
  title: { default: "CampOps Marketplace", template: "%s | CampOps" },
  description: "Find and book your perfect camp stay",
};

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Nav locale={locale} />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}

function Nav({ locale }: { locale: string }) {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href={`/${locale}`} className="flex items-center gap-2">
          <span className="text-2xl font-bold text-brand-600">CampOps</span>
        </a>
        <div className="flex items-center gap-4 text-sm">
          <a href={`/${locale}/search`} className="text-gray-600 hover:text-brand-600 transition-colors">
            Search
          </a>
          <a
            href={`/${locale}/login`}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 text-sm py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p>© {new Date().getFullYear()} CampOps. All rights reserved.</p>
      </div>
    </footer>
  );
}

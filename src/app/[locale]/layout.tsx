import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/request';

export const metadata: Metadata = {
  title: { default: 'SinaiCamps Marketplace', template: '%s | SinaiCamps' },
  description: 'Find and book your perfect camp stay',
};

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

import { Nav } from '@/components/Nav';

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

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 text-sm py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p>© {new Date().getFullYear()} SinaiCamps. All rights reserved.</p>
      </div>
    </footer>
  );
}

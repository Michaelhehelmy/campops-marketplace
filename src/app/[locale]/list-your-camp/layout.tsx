import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

async function getPlatformName(): Promise<string> {
  try {
    const settings = await db
      .prepare(
        `
        SELECT platform_name as "platformName"
        FROM marketplace_settings
        WHERE id = 'marketplace_settings'
        `
      )
      .get();
    return settings?.platformName ?? 'SinaiCamps';
  } catch {
    return 'SinaiCamps';
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const platformName = await getPlatformName();
  return {
    title: `List Your Camp – ${platformName}`,
    description: 'Register your property and start accepting bookings.',
  };
}

export default async function ListYourCampLayout({ children }: { children: React.ReactNode }) {
  const platformName = await getPlatformName();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-600">
            {platformName}
          </Link>
          <span className="text-sm text-gray-400">Become a host</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">{children}</main>
    </div>
  );
}
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'List Your Camp – SinaiCamps',
  description: 'Register your property and start accepting bookings.',
};

export default function ListYourCampLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-600">
            SinaiCamps
          </Link>
          <span className="text-sm text-gray-400">Become a host</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">{children}</main>
    </div>
  );
}

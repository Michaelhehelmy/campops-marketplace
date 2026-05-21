'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, DollarSign, Star, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PluginShell } from '@/app/PluginShell';

interface Stats {
  upcomingBookings: number;
  totalRevenue: number;
  currency: string;
  occupancyRate: number;
}

export default function OwnerDashboardPage() {
  const t = useTranslations('owner.dashboard');
  const { locale } = useParams();
  const [stats, setStats] = useState<Stats | null>(null);
  const [propertyName, setPropertyName] = useState<string>('');
  const [plan, setPlan] = useState<string>('basic');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/owner/me');
        if (res.ok) {
          const data = await res.json();
          setPropertyName(data.property.name);
          setPlan(data.property.plan);
        }
      } catch {
        /* ignore */
      }

      // Stub stats — replace with real API call when endpoint exists
      setStats({
        upcomingBookings: 3,
        totalRevenue: 4200,
        currency: 'USD',
        occupancyRate: 67,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PluginShell name="dashboard.top" />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {propertyName ? `${propertyName}` : t('title')}
          </h1>
          <p className="text-gray-500 mt-0.5">
            {t('planLabel', { plan })}
            {plan === 'basic' && (
              <>
                {' · '}
                <Link
                  href={`/${locale}/list-your-camp/plan`}
                  className="text-brand-600 hover:underline text-sm"
                >
                  {t('upgrade')}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <PluginShell name="dashboard.middle" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-brand-600" />}
          label={t('upcomingBookings')}
          value={String(stats?.upcomingBookings ?? 0)}
          bg="bg-brand-50"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          label={t('totalRevenue')}
          value={`${stats?.currency} ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          bg="bg-green-50"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-amber-500" />}
          label={t('occupancyRate')}
          value={`${stats?.occupancyRate ?? 0}%`}
          bg="bg-amber-50"
        />
      </div>

      <PluginShell name="dashboard.widgets" />

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickAction
          href={`/${locale}/owner/bookings`}
          title={t('viewBookings')}
          description={t('viewBookingsDesc')}
          icon={<CalendarDays size={20} />}
        />
        <QuickAction
          href={`/${locale}/owner/property`}
          title={t('editListing')}
          description={t('editListingDesc')}
          icon={<Star size={20} />}
        />
      </div>

      <PluginShell name="dashboard.bottom" />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
            {title}
          </h3>
          <ArrowUpRight
            size={15}
            className="text-gray-400 group-hover:text-brand-600 transition-colors"
          />
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

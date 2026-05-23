'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Globe } from 'lucide-react';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com';

export default function SuccessPage() {
  const { locale } = useParams();
  const params = useSearchParams();
  const plan = params.get('plan') ?? 'basic';
  const slug = params.get('slug') ?? '';
  const [platformName, setPlatformName] = useState('SinaiCamps');

  useEffect(() => {
    fetch('/api/public/platform-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.platformName) setPlatformName(data.platformName);
      })
      .catch(() => {});
  }, []);

  const isPremium = plan === 'subdomain' || plan === 'custom_domain';
  const dashboardUrl =
    plan === 'subdomain'
      ? `https://${slug}.${BASE_DOMAIN}/admin/dashboard`
      : plan === 'custom_domain'
        ? `/admin/dashboard`
        : `/${locale}/owner/dashboard`;

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-8 h-8 text-brand-600" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">You're all set!</h1>
      <p className="text-gray-500 text-lg mb-8">
        {isPremium
          ? 'Your Operations Suite is ready. Head to your admin panel to set up rooms, rates, and more.'
          : `Your property is listed on ${platformName}. You can manage it from your owner dashboard.`}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 text-left max-w-sm mx-auto">
        <h2 className="font-semibold text-gray-900 mb-4">What's next</h2>
        <ul className="space-y-3 text-sm text-gray-600">
          {plan === 'subdomain' && (
            <li className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              Your subdomain:{' '}
              <strong className="text-gray-900 ml-1">
                {slug}.{BASE_DOMAIN}
              </strong>
            </li>
          )}
          {plan === 'custom_domain' && (
            <li className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
              Point your domain's CNAME to{' '}
              <strong className="text-gray-900 ml-1">{BASE_DOMAIN}</strong> — SSL will be
              provisioned automatically.
            </li>
          )}
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
            Add your room types and set pricing
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
            Upload photos to attract guests
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
            {isPremium
              ? 'Configure POS menus and inventory'
              : 'View your first bookings as they arrive'}
          </li>
        </ul>
      </div>

      <Link
        href={dashboardUrl}
        className="inline-flex items-center gap-2 btn-primary px-8 py-3 text-base"
      >
        Go to my dashboard
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}

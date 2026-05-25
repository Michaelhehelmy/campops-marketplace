'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com';

interface Plan {
  id: 'basic' | 'premium' | 'ultimate';
  name: string;
  price: string;
  badge?: string;
  features: string[];
  note?: string;
}

export default function Step3PlanPage() {
  const router = useRouter();
  const { locale } = useParams();
  const [selected, setSelected] = useState<Plan['id']>('basic');
  const [customDomain, setCustomDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [platformName, setPlatformName] = useState('SinaiCamps');

  useEffect(() => {
    fetch('/api/public/platform-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.platformName) setPlatformName(data.platformName);
      })
      .catch(() => {});
  }, []);

  const PLANS: Plan[] = [
    {
      id: 'basic',
      name: 'Basic Listing',
      price: 'Free forever',
      features: [
        `Public listing on ${platformName} marketplace`,
        'View incoming bookings (read-only)',
        'Edit property details, photos & amenities',
        'Basic rate management',
      ],
    },
    {
      id: 'premium',
      name: 'Operations Suite',
      price: '$49 / month',
      badge: 'Most Popular',
      features: [
        'Everything in Basic',
        'Full operations panel',
        'POS, KDS, Housekeeping & Inventory',
        'Loyalty & rewards program',
        'Reports & analytics',
        `Your own subdomain (campname.${BASE_DOMAIN})`,
        'Plugin ecosystem access',
      ],
      note: '14-day free trial, cancel anytime',
    },
    {
      id: 'ultimate',
      name: 'White Label',
      price: '$99 / month',
      features: [
        'Everything in Operations Suite',
        'Your own domain (e.g. bookings.mycamp.com)',
        'Custom branding (logo & colors)',
        'SSL certificate — fully managed',
        'Priority support',
      ],
      note: '14-day free trial, cancel anytime',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const step1 = JSON.parse(sessionStorage.getItem('reg_step1') ?? '{}');
    const step2 = JSON.parse(sessionStorage.getItem('reg_step2') ?? '{}');

    if (!step1.email || !step2.slug) {
      setError('Registration data missing. Please start over.');
      return;
    }

    if (selected === 'ultimate' && !customDomain.trim()) {
      setError('Please enter your custom domain.');
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const brandingData = sessionStorage.getItem('reg_branding');
          const branding = brandingData ? JSON.parse(brandingData) : {};

          const body: Record<string, any> = {
            ...step1,
            ...step2,
            plan: selected,
            branding,
          };
          if (selected === 'ultimate') {
            body.custom_domain = customDomain.trim().toLowerCase();
            body.stripe_payment_method_id = 'pm_placeholder';
          }
          if (selected === 'premium') {
            body.stripe_payment_method_id = 'pm_placeholder';
          }

          const res = await fetch('/api/owner/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? 'Registration failed. Please try again.');
            return;
          }

          await fetch('/api/auth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: data.token }),
          });

          sessionStorage.removeItem('reg_step1');
          sessionStorage.removeItem('reg_step2');

          router.push(`/${locale}/list-your-camp/success?plan=${selected}&slug=${step2.slug}`);
        } catch {
          setError('Network error. Please check your connection and try again.');
        }
      })();
    });
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-2 mb-6">
          {['Account', 'Branding', 'Plan', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${i <= 2 ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                {i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-12 ${i < 2 ? 'bg-brand-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Choose your plan</h1>
        <p className="text-gray-500 mt-1">Start free. Upgrade when you're ready.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 mb-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`cursor-pointer rounded-2xl border-2 p-6 transition-all ${
                selected === plan.id
                  ? 'border-brand-600 bg-brand-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-brand-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-gray-900">{plan.name}</h2>
                    {plan.badge && (
                      <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full font-medium">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-brand-600 font-bold mb-3">{plan.price}</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.note && <p className="text-xs text-gray-400 mt-3">{plan.note}</p>}
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center
                  ${selected === plan.id ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`}
                >
                  {selected === plan.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              {plan.id === 'ultimate' && selected === 'ultimate' && (
                <div className="mt-4 pt-4 border-t border-brand-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your custom domain
                  </label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="bookings.mycamp.com"
                    className="input"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Point a CNAME record from this domain to{' '}
                    <code className="bg-gray-100 px-1 rounded">{BASE_DOMAIN}</code> after
                    registering.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {(selected === 'premium' || selected === 'ultimate') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 text-sm text-yellow-800">
            <strong>Payment:</strong> Premium plans require a card. We'll collect payment details on
            the next step via Stripe. Your 14-day trial starts today.
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating your account…
              </>
            ) : (
              'Create my account →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

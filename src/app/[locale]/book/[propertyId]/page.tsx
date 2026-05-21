'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, User, Mail, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { createBooking } from '@/lib/api';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
  );
}

export default function BookPropertyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      }
    >
      <BookPropertyContent />
    </Suspense>
  );
}

function BookPropertyContent() {
  const t = useTranslations('booking');
  const params = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const locale = params.locale as string;
  const propertyId = params.propertyId as string;
  const { data: session, isPending } = authClient.useSession();

  const checkIn = sp.get('checkIn') ?? '';
  const checkOut = sp.get('checkOut') ?? '';
  const guests = parseInt(sp.get('guests') ?? '2');
  const currency = sp.get('currency') ?? 'USD';
  const nights = nightsBetween(checkIn, checkOut);

  const [step, setStep] = useState<'details' | 'confirmation'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [pricePerNight, setPricePerNight] = useState(0);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const [form, setForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    adults: guests || 2,
  });

  useEffect(() => {
    fetch('/api/csrf-token', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.csrfToken) setCsrfToken(data.csrfToken);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        guestName: prev.guestName || session.user.name || '',
        guestEmail: prev.guestEmail || session.user.email || '',
      }));
    }
  }, [session]);

  useEffect(() => {
    fetch(`/api/public/properties/${propertyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.property) {
          setPropertyName(data.property.name || '');
          setPricePerNight(
            data.property.price_per_night || data.property.min_price_per_night || 150
          );
        }
      })
      .catch(() => {});
  }, [propertyId]);

  const total = pricePerNight * nights;

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createBooking({
        propertyId,
        roomTypeId: '',
        checkIn,
        checkOut,
        guestName: form.guestName,
        guestEmail: form.guestEmail,
        adults: form.adults,
        paymentProvider: 'stripe',
        currency,
      });
      setReservationId(result.reservationId);
      setStep('confirmation');
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!session) {
    const nextParams = new URLSearchParams();
    if (checkIn) nextParams.set('checkIn', checkIn);
    if (checkOut) nextParams.set('checkOut', checkOut);
    if (guests) nextParams.set('guests', String(guests));
    const next = `/${locale}/book/${propertyId}?${nextParams.toString()}`;
    router.replace(`/${locale}/login?next=${encodeURIComponent(next)}`);
    return null;
  }

  if (step === 'confirmation') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle2 className="w-16 h-16 text-brand-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('bookingConfirmed')}</h1>
        <p className="text-gray-500 mb-6">
          {t('confirmedDesc', { name: propertyName, email: form.guestEmail })}
        </p>
        {reservationId && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 inline-block mb-8">
            <p className="text-xs text-gray-400 mb-1">{t('bookingRef')}</p>
            <p className="font-mono font-bold text-lg text-gray-900">{reservationId}</p>
          </div>
        )}
        <button
          onClick={() => router.push(`/${locale}/guest`)}
          className="bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          {t('viewReservations') || 'View My Reservations'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('guestDetails')}</h2>

            <div>
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  id="guestName"
                  type="text"
                  value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Jane Smith"
                />
              </div>
            </div>

            <div>
              <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  id="guestEmail"
                  type="email"
                  value={form.guestEmail}
                  onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 mb-1">
                {t('phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="guestPhone"
                  type="tel"
                  value={form.guestPhone}
                  onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="+1 555 000 0000"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('adults')}
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  max={20}
                  value={form.adults}
                  onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || !form.guestName || !form.guestEmail}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('confirmBooking')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">{t('summary')}</h3>
          <div className="text-sm space-y-2 mb-4 pb-4 border-b border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>Property</span>
              <span className="font-medium">{propertyName || `#${propertyId}`}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('checkIn')}</span>
              <span className="font-medium">{checkIn}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('checkOut')}</span>
              <span className="font-medium">{checkOut}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Duration</span>
              <span className="font-medium">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('perNight')}</span>
              <span className="font-medium">{formatPrice(pricePerNight, currency)}</span>
            </div>
          </div>

          <div className="flex justify-between font-bold text-gray-900">
            <span>{t('totalAmount')}</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

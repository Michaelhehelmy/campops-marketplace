'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, User, Mail, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { createBooking } from '@/lib/api';

type Step = 'details' | 'payment' | 'confirmation';

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

export default function BookingSummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      }
    >
      <BookingSummaryContent />
    </Suspense>
  );
}

function BookingSummaryContent() {
  const t = useTranslations('booking');
  const params = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { data: session, isPending } = authClient.useSession();

  const propertyId = sp.get('propertyId') ?? '';
  const roomTypeId = sp.get('roomTypeId') ?? '';
  const checkIn = sp.get('checkIn') ?? '';
  const checkOut = sp.get('checkOut') ?? '';
  const currency = sp.get('currency') ?? 'USD';
  const roomName = sp.get('roomName') ?? '';
  const propertyName = sp.get('propertyName') ?? '';
  const pricePerNight = parseFloat(sp.get('price') ?? '0');
  const priceCurrency = sp.get('priceCurrency') ?? currency;
  const nights = nightsBetween(checkIn, checkOut);
  const total = pricePerNight * nights;

  const [step, setStep] = useState<Step>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    adults: 2,
    children: 0,
    paymentProvider: 'stripe',
  });

  // Redirect unauthenticated users to login
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
    if (propertyId) nextParams.set('propertyId', propertyId);
    if (roomTypeId) nextParams.set('roomTypeId', roomTypeId);
    const next = `/${locale}/book/summary?${nextParams.toString()}`;
    router.replace(`/${locale}/login?next=${encodeURIComponent(next)}`);
    return null;
  }

  console.log('[BookingSummary] params:', {
    propertyId,
    roomTypeId,
    checkIn,
    checkOut,
    currency,
    roomName,
    propertyName,
    pricePerNight,
    nights,
    total,
  });

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handleConfirm = async () => {
    console.log('[BookingSummary] handleConfirm called');
    setIsLoading(true);
    setError(null);
    try {
      const result = await createBooking({
        propertyId,
        roomTypeId,
        checkIn,
        checkOut,
        guestName: form.guestName || 'Test Guest',
        guestEmail: form.guestEmail || 'test@example.com',
        adults: form.adults,
        paymentProvider: form.paymentProvider,
        currency,
      });

      console.log('[BookingSummary] Success:', JSON.stringify(result));
      setReservationId(result.reservationId);
      setStep('confirmation');
    } catch (err: any) {
      console.error('[BookingSummary] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
          onClick={() => router.push(`/${locale}/search`)}
          className="bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          {t('searchMore')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <button
        onClick={() => (step === 'details' ? router.back() : setStep('details'))}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {step === 'details' ? 'Back' : t('editDetails')}
      </button>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {(['details', 'payment'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${
                step === s
                  ? 'bg-brand-600 text-white'
                  : step === 'payment' && s === 'details'
                    ? 'bg-brand-100 text-brand-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${step === s ? 'font-medium text-gray-900' : 'text-gray-400'}`}
            >
              {s === 'details' ? t('guestDetails') : t('payment')}
            </span>
            {i < 1 && <div className="flex-1 h-px bg-gray-200 min-w-6" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2">
          {step === 'details' && (
            <form
              onSubmit={handleDetailsSubmit}
              className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4"
            >
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
                    name="guestName"
                    value={form.guestName}
                    onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Jane Smith"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="guestEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    required
                    id="guestEmail"
                    type="email"
                    name="guestEmail"
                    value={form.guestEmail}
                    onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="guestPhone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                    name="adults"
                    min={1}
                    max={20}
                    value={form.adults}
                    onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('children')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={form.children}
                    onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                data-testid="continue-to-payment"
                onClick={() => setStep('payment')}
                className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors mt-2"
              >
                {t('proceedToPayment')}
              </button>
            </form>
          )}

          {step === 'payment' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2
                data-testid="payment-method-heading"
                className="text-lg font-semibold text-gray-900 mb-4"
              >
                {t('paymentMethod')}
              </h2>

              <div className="space-y-3 mb-6">
                {[
                  { id: 'stripe', label: t('card'), icon: '💳' },
                  { id: 'paypal', label: t('paypal'), icon: '🅿️' },
                  { id: 'pay_later', label: t('payLater'), icon: '🏕️' },
                ].map((method) => (
                  <label
                    key={method.id}
                    htmlFor={method.id}
                    className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors
                      ${
                        form.paymentProvider === method.id
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-brand-300'
                      }`}
                  >
                    <input
                      id={method.id}
                      type="radio"
                      name="paymentProvider"
                      value={method.id}
                      checked={form.paymentProvider === method.id}
                      onChange={() => setForm({ ...form, paymentProvider: method.id })}
                      className="text-brand-600"
                    />
                    <span className="text-lg">{method.icon}</span>
                    <span className="font-medium text-gray-800">{method.label}</span>
                  </label>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {form.paymentProvider === 'pay_later' ? t('confirmBooking') : t('proceedToPayment')}
              </button>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">{t('summary')}</h3>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-lg">
              🏕️
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{propertyName}</p>
              <p className="text-xs text-gray-500">{roomName}</p>
            </div>
          </div>

          <div className="text-sm space-y-2 mb-4 pb-4 border-b border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>{t('checkIn')}</span>
              <span className="font-medium">{checkIn}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('checkOut')}</span>
              <span className="font-medium">{checkOut}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('duration')}</span>
              <span className="font-medium">
                {nights} {t('nights', { n: nights })}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('perNight')}</span>
              <span className="font-medium">{formatPrice(pricePerNight, priceCurrency)}</span>
            </div>
          </div>

          <div className="flex justify-between font-bold text-gray-900">
            <span>{t('totalAmount')}</span>
            <span>{formatPrice(total, priceCurrency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

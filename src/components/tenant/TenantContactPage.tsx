'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

interface TenantData {
  name: string;
  branding: any;
  city?: string;
  country?: string;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantContactPage({ tenant }: Props) {
  const t = useTranslations('tenant');
  const contact = tenant.branding?.contact || {};
  const address = tenant.branding?.contact?.address || '';
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/tenant/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          message: form.get('message'),
          propertyId: (tenant as any).id,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Contact form submission failed', err);
      setError(t('errorSending'));
    } finally {
      setSending(false);
    }
  };

  const whatsappLink = contact.phone
    ? `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`
    : null;

  const googleMapsSrc = address
    ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1e3!2d0!3d0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${encodeURIComponent(address)}!5e0!3m2!1sen!2s!4v1`
    : '';

  if (submitted && !error) {
    return (
      <main className="min-h-screen py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-black text-white mb-4">{t('thankYou')}</h1>
          <p className="text-zinc-400 text-lg">{t('thankYouDesc')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-4">{t('contactUs')}</h1>
        <p className="text-zinc-400 mb-12 max-w-xl">{t('wedLoveToHear', { name: tenant.name })}</p>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact details */}
          <div className="space-y-6">
            {contact.email && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('emailLabel')}</h3>
                <a href={`mailto:${contact.email}`} className="text-white hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('phoneLabel')}</h3>
                <p className="text-white">{contact.phone}</p>
              </div>
            )}
            {whatsappLink && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('whatsappLabel')}</h3>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline"
                >
                  {t('chatOnWhatsApp')}
                </a>
              </div>
            )}
            {address && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('addressLabel')}</h3>
                <p className="text-white">{address}</p>
              </div>
            )}
            {(tenant.city || tenant.country) && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('locationLabel')}</h3>
                <p className="text-white">
                  {[tenant.city, tenant.country].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Google Maps embed */}
            {googleMapsSrc && (
              <div className="rounded-2xl overflow-hidden border border-zinc-800 mt-6">
                <iframe
                  src={googleMapsSrc}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${tenant.name} location`}
                />
              </div>
            )}
          </div>

          {/* Contact form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg" role="alert">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
                {t('name')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
                placeholder={t('yourName')}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                {t('email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
                placeholder={t('yourEmail')}
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-zinc-300 mb-1">
                {t('message')}
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] resize-y"
                placeholder={t('yourMessage')}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('sending')}
                </span>
              ) : submitted ? (
                t('messageSent')
              ) : (
                t('sendMessage')
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

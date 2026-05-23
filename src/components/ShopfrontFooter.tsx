'use client';

'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Tent } from 'lucide-react';

interface Props {
  tenant: {
    name: string;
    city: string;
    country: string;
    branding?: any;
  };
}

export function ShopfrontFooter({ tenant }: Props) {
  const colors = tenant.branding?.colors || {
    primary: '#0f172a',
    secondary: '#3b82f6',
    accent: '#10b981',
  };

  const contact = tenant.branding?.contact || {};
  const tagline = tenant.branding?.tagline || 'Experience Sinai like never before.';
  const [platformName, setPlatformName] = useState('SinaiCamps Marketplace');

  useEffect(() => {
    fetch('/api/public/platform-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.platformName) setPlatformName(data.platformName);
      })
      .catch(() => {});
  }, []);

  return (
    <footer
      className="bg-slate-950 text-zinc-400 text-sm py-12 mt-16 border-t border-slate-900"
      style={{
        borderTopColor: `${colors.secondary}15`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-900">
          {/* Brand/About Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Tent className="w-5 h-5" style={{ color: colors.secondary || '#3b82f6' }} />
              <span className="text-lg font-black text-white">{tenant.name}</span>
            </div>
            <p className="text-zinc-500 text-xs max-w-sm leading-relaxed">{tagline}</p>
          </div>

          {/* Quick Links Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#rooms" className="hover:text-white transition-colors">
                  Our Rooms
                </a>
              </li>
              <li>
                <a href="#bookings" className="hover:text-white transition-colors">
                  Reservations
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Get in Touch</h4>
            <ul className="space-y-2.5 text-xs text-zinc-500">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {tenant.city}, {tenant.country || 'Egypt'}
                </span>
              </li>
              {contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{contact.phone}</span>
                </li>
              )}
              {contact.email && (
                <li className="flex items-center gap-2">
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{contact.email}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>
            © {new Date().getFullYear()} {tenant.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="font-bold text-zinc-400">{platformName}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

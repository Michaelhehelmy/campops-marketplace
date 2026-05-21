'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales } from '@/i18n/request';

const localeNames: Record<string, string> = {
  en: 'English',
  ar: 'العربية',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export function LanguageSwitcher({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchTo = (l: string) => {
    setOpen(false);
    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${l}`);
    router.push(newPath);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition-colors text-sm font-bold p-2 rounded-xl hover:bg-slate-900/60"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                l === locale
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-zinc-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {localeNames[l] || l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

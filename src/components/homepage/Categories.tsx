'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  count: number;
}

interface CategoriesProps {
  locale?: string;
}

export default function Categories({ locale = 'en' }: CategoriesProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('categories');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/public/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setCategories(data.categories || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20" role="status" aria-live="polite">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <span className="sr-only">Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-red-50/50 border border-red-200/60 rounded-2xl p-6 text-red-800 text-sm text-center backdrop-blur-md">
        {error}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Property categories"
      className="py-20 px-4 bg-slate-50/50 border-y border-slate-100"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-50 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
            {t('badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            {t('title')}
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Categories Grid */}
        <div role="list" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => router.push(`/${locale}/search?category=${category.slug}`)}
              className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.06)] hover:border-amber-400/50 transition-all duration-300 text-center flex flex-col items-center transform hover:-translate-y-1"
              role="listitem"
              aria-label={`Browse ${category.name} category with ${category.count} properties`}
            >
              {/* Category Icon */}
              <div
                className="w-16 h-16 bg-slate-50 group-hover:bg-amber-50 rounded-2xl flex items-center justify-center text-4xl mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                aria-hidden="true"
              >
                {category.icon || '📌'}
              </div>

              {/* Category Meta */}
              <h3 className="font-extrabold text-slate-800 text-sm mb-1 group-hover:text-amber-500 transition-colors">
                {category.name}
              </h3>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('propertyCount', { count: category.count })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

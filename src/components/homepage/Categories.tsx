'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center">
        {error}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section aria-label="Property categories" className="py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Browse by Category</h2>
          <p className="text-lg text-gray-500">Find the perfect type of stay for your adventure</p>
        </div>

        <div role="list" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => router.push(`/${locale}/search?category=${category.slug}`)}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 text-center"
              role="listitem"
              aria-label={`Browse ${category.name} category with ${category.count} properties`}
            >
              <div
                className="text-4xl mb-3 group-hover:scale-110 transition-transform"
                aria-hidden="true"
              >
                {category.icon || '🏕️'}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-brand-600 transition-colors">
                {category.name}
              </h3>
              <p className="text-xs text-gray-500">{category.count} properties</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { DocMeta } from '@/lib/docs';
import { getCategoryLabel } from '@/lib/docs-utils';

interface DocsSidebarProps {
  docs: DocMeta[];
}

export function DocsSidebar({ docs }: DocsSidebarProps) {
  const pathname = usePathname();
  const categories = new Map<string, DocMeta[]>();

  docs.forEach((doc) => {
    const cat = doc.category || '';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(doc);
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const active = new Set<string>();
    categories.forEach((_, cat) => {
      const hasActive = docs.some((d) => pathname === `/docs/${d.slug}`);
      if (hasActive) active.add(cat);
    });
    return active;
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const sortedCategories = Array.from(categories.entries()).sort(([a], [b]) => {
    const order = ['', 'api', 'architecture', 'development', 'user-guides', 'deployment', 'plugins'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <nav className="py-4 px-3" aria-label="Documentation navigation">
      {sortedCategories.map(([category, categoryDocs]) => (
        <div key={category} className="mb-2">
          <button
            onClick={() => toggleCategory(category)}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {expandedCategories.has(category) ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {getCategoryLabel(category)}
          </button>

          {expandedCategories.has(category) && (
            <div className="ml-4 mt-1 space-y-0.5">
              {categoryDocs.map((doc) => {
                const href = `/docs/${doc.slug}`;
                const isActive = pathname === href;

                return (
                  <Link
                    key={doc.slug}
                    href={href}
                    className={`block px-2 py-1.5 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {doc.title}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

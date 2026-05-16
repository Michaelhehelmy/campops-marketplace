import { PluginShell } from '@/app/PluginShell';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import HeroSection from '@/components/homepage/HeroSection';
import FeaturedListings from '@/components/homepage/FeaturedListings';
import Categories from '@/components/homepage/Categories';
import React from 'react';

interface Props {
  params: { locale: string };
}

async function getHomepageConfig() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/public/homepage-config`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      // Return default config on error
      return {
        sections: ['hero', 'featured-listings', 'categories'],
        roleBased: {
          guest: { hero: 'personalized-hero' },
          admin: { hero: 'dashboard-link' },
          master: { hero: 'dashboard-link' },
        },
      };
    }
    return await res.json();
  } catch (error) {
    // Return default config on error
    return {
      sections: ['hero', 'featured-listings', 'categories'],
      roleBased: {
        guest: { hero: 'personalized-hero' },
        admin: { hero: 'dashboard-link' },
        master: { hero: 'dashboard-link' },
      },
    };
  }
}

export default async function HomePage({ params }: Props) {
  const config = await getHomepageConfig();
  const { locale } = params;

  const fallbackMap: Record<string, React.ReactNode> = {
    hero: <HeroSection locale={locale} />,
    'featured-listings': <FeaturedListings locale={locale} />,
    categories: <Categories locale={locale} />,
  };

  return (
    <PluginRegistryProvider>
      <main className="space-y-16 py-8">
        {/* Resource plugin: public.homepage slot (featured listings) */}
        <PluginShell name="public.homepage" props={{ locale }} fallback={null} />

        {/* Resource plugin: public.search slot */}
        <PluginShell name="public.search" props={{ locale }} fallback={null} />

        {config.sections.map((sectionName: string) => (
          <PluginShell
            key={sectionName}
            name={`homepage.${sectionName}`}
            props={{ locale }}
            fallback={fallbackMap[sectionName] || null}
          />
        ))}
      </main>
    </PluginRegistryProvider>
  );
}

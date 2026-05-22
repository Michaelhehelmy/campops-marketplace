import React from 'react';
import { db } from '@/lib/db';

function getBrandColors(settings: any) {
  return {
    primary: settings?.branding?.colors?.primary || '#16a34a',
    secondary: settings?.branding?.colors?.secondary || '#22c55e',
    accent: settings?.branding?.colors?.accent || '#10b981',
  };
}

export default async function Head({ params }: { params: { slug: string } }) {
  const property = (await db
    .prepare(
      `
    SELECT name, settings
    FROM properties
    WHERE slug = $1 OR id = $1
    LIMIT 1
  `
    )
    .get(params.slug)) as any;

  const settings =
    property?.settings && typeof property.settings === 'string'
      ? JSON.parse(property.settings)
      : property?.settings || {};
  const colors = getBrandColors(settings);

  return (
    <>
      <style>{`:root{--tenant-primary:${colors.primary};--tenant-secondary:${colors.secondary};--tenant-accent:${colors.accent};}`}</style>
      <meta name="theme-color" content={colors.primary} />
      <meta name="listing-name" content={property?.name || 'SinaiCamps Listing'} />
    </>
  );
}

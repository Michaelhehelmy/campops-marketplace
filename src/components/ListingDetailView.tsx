import React from 'react';
import type { Post } from '@/lib/PostQuery';
import SingleListing from '@themes/camp-classic/templates/single-listing';

interface Props {
  property: any;
  room_types: any[];
  locale: string;
  checkIn?: string;
  checkOut?: string;
  currency?: string;
}

export default function ListingDetailView({
  property,
  room_types,
  locale,
  checkIn,
  checkOut,
  currency = 'USD',
}: Props) {
  const settings =
    typeof property.settings === 'string'
      ? JSON.parse(property.settings || '{}')
      : property.settings || {};

  const post: Post = {
    id: property.id ?? '',
    siteId: property.site_id ?? property.siteId ?? '',
    postType: 'listing',
    postStatus: 'publish',
    postSlug: property.slug ?? null,
    postTitle: property.name ?? '',
    postContent: property.description ?? null,
    authorId: null,
    parentId: null,
    menuOrder: 0,
    createdAt: null,
    updatedAt: null,
    meta: {
      settings: typeof property.settings === 'string' ? property.settings : JSON.stringify(settings),
      room_types: Array.isArray(property.room_types)
        ? JSON.stringify(property.room_types)
        : JSON.stringify(room_types),
      primary_image: property.primary_image ?? null,
      city: property.city ?? null,
      country: property.country ?? null,
      amenities: Array.isArray(property.amenities)
        ? JSON.stringify(property.amenities)
        : property.amenities ?? null,
      rating: String(property.rating ?? ''),
      price_per_night: property.price_per_night ?? null,
    },
  };

  let parsedRoomTypes = room_types;
  if (Array.isArray(property.room_types)) {
    parsedRoomTypes = property.room_types;
  }

  return (
    <SingleListing
      post={post}
      roomTypes={parsedRoomTypes}
      locale={locale}
      checkIn={checkIn}
      checkOut={checkOut}
      currency={currency}
      showBreadcrumb={false}
    />
  );
}

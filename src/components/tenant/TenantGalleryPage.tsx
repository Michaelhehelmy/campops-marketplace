'use client';

import { useState } from 'react';

interface TenantData {
  name: string;
  branding: any;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantGalleryPage({ tenant }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const images = Array.from({ length: 6 }, (_, i) => i + 1);

  const closeLightbox = () => setSelectedIndex(null);

  return (
    <main className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-4">Gallery</h1>
        <p className="text-zinc-400 mb-12 max-w-xl">
          A glimpse into the {tenant.name} experience.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i - 1)}
              className="aspect-square rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-600 border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
              aria-label={`View photo ${i}`}
            >
              Photo {i}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox overlay */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full aspect-video rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg">
              Photo {selectedIndex + 1}
            </div>
            <button
              onClick={closeLightbox}
              className="absolute -top-12 end-0 text-white hover:text-zinc-300 text-4xl leading-none"
              aria-label="Close lightbox"
            >
              &times;
            </button>
            {/* Navigation */}
            <div className="absolute bottom-4 start-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    idx === selectedIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                  aria-label={`Go to photo ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import React, { useEffect, useState } from 'react';

export function TestBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if pwa-preview flag is set
    const previewFlag = localStorage.getItem('pwa-preview');
    setShowBanner(previewFlag === 'true');
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div data-testid="pwa-install-banner" className="bg-blue-500 text-white p-4">
      Install CampOps App
    </div>
  );
}

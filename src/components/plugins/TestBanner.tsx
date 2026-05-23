'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function TestBanner() {
  const t = useTranslations('property');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const previewFlag = localStorage.getItem('pwa-preview');
    setShowBanner(previewFlag === 'true');
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div data-testid="pwa-install-banner" className="bg-blue-500 text-white p-4">
      {t('installApp')}
    </div>
  );
}

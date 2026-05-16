'use client';

import { useEffect } from 'react';

export default function PWAServiceWorker() {
  useEffect(() => {
    const h = window.location.hostname;
    if ('serviceWorker' in navigator && h !== 'localhost' && h !== '127.0.0.1') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg))
        .catch((err) => console.error('SW registration failed:', err));
    }
  }, []);

  return null;
}

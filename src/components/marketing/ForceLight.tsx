'use client';
import { useEffect } from 'react';

export function ForceLight() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    // capture ?ref=CODE for the affiliate program
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) localStorage.setItem('klientic.ref', ref);
    } catch { /* ignore */ }
  }, []);
  return null;
}

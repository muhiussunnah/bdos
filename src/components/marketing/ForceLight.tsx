'use client';
import { useEffect } from 'react';

export function ForceLight() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);
  return null;
}

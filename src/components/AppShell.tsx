'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid h-screen overflow-hidden lg:grid-cols-[248px_1fr]">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="relative overflow-y-auto">
        <Topbar onMenu={() => setOpen(true)} />
        <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-7 md:px-[30px]">{children}</div>
      </main>
    </div>
  );
}

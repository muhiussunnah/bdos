'use client';

import { useEffect, useState } from 'react';
import { Download, ArrowRight, Share, Plus } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    setShowHelp((v) => !v);
  }

  return (
    <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] px-6 py-7 text-center sm:flex-row sm:text-left">
      <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl text-white"
        style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)', boxShadow: '0 8px 22px rgba(164,53,232,.4)' }}>
        <Download size={22} />
      </span>

      <div className="flex-1">
        <div className="text-[15.5px] font-bold text-white">Install the {`Klientic`} app</div>
        <div className="mt-0.5 text-[13px] leading-relaxed text-white/55">
          One tap from your phone home screen or desktop — no app store, works offline.
        </div>
      </div>

      <button onClick={handleClick}
        className="inline-flex flex-none items-center gap-1.5 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white transition hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg,#B44BF0,#A435E8 45%,#E0457E)', boxShadow: '0 8px 22px rgba(164,53,232,.4)' }}>
        {deferred ? 'Install app' : 'How to install'} <ArrowRight size={15} />
      </button>

      {showHelp && !deferred && (
        <div className="basis-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[12.5px] leading-relaxed text-white/70">
          {isIOS ? (
            <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
              Tap <Share size={14} className="inline text-white" /> <b className="font-semibold text-white">Share</b> in Safari, then
              <b className="font-semibold text-white">Add to Home Screen</b> <Plus size={13} className="inline" />.
            </span>
          ) : (
            <span>
              Open your browser menu (⋮) and choose <b className="font-semibold text-white">Install app</b> or{' '}
              <b className="font-semibold text-white">Add to Home Screen</b>.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

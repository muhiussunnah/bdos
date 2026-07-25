'use client';

import { useEffect, useState } from 'react';
import { Share2, X, ArrowUp, Facebook, Linkedin, Link2, Check } from 'lucide-react';

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}
function XIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
}

export function FloatingUI() {
  const [shareOpen, setShareOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(window.location.href);
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const enc = encodeURIComponent(url);
  const links = [
    { key: 'fb', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, icon: <Facebook size={18} />, bg: '#1877F2' },
    { key: 'wa', label: 'WhatsApp', href: `https://wa.me/?text=${enc}`, icon: <WhatsAppIcon size={17} />, bg: '#25D366' },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${enc}`, icon: <XIcon size={16} />, bg: '#16121F' },
    { key: 'li', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, icon: <Linkedin size={18} />, bg: '#0A66C2' },
  ];

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      {/* social share — bottom left */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col-reverse items-center gap-2.5">
        <button onClick={() => setShareOpen((v) => !v)} aria-label="Share this page"
          className="grid h-12 w-12 place-items-center rounded-full text-white shadow-[0_8px_24px_rgba(164,53,232,.4)] transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>
          {shareOpen ? <X size={20} /> : <Share2 size={19} />}
        </button>
        {shareOpen && links.map((l, i) => (
          <a key={l.key} href={l.href} target="_blank" rel="noreferrer noopener" title={`Share on ${l.label}`}
            className="grid h-11 w-11 place-items-center rounded-full text-white shadow-lg transition hover:scale-110"
            style={{ background: l.bg, animation: `reveal .3s cubic-bezier(.2,.7,.3,1) ${i * 0.04}s both` }}>
            {l.icon}
          </a>
        ))}
        {shareOpen && (
          <button onClick={copy} title="Copy link"
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#16121F] shadow-lg ring-1 ring-[#ECEAF1] transition hover:scale-110"
            style={{ animation: 'reveal .3s cubic-bezier(.2,.7,.3,1) .16s both' }}>
            {copied ? <Check size={18} className="text-[#16A34A]" /> : <Link2 size={18} />}
          </button>
        )}
      </div>

      {/* scroll to top — bottom right */}
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top"
        className={`fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full text-white shadow-[0_8px_24px_rgba(164,53,232,.4)] transition-all duration-300 hover:-translate-y-0.5 ${showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
        style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>
        <ArrowUp size={20} />
      </button>
    </>
  );
}

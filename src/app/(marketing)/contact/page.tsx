'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { BRAND } from '@/lib/constants';

export default function ContactPage() {
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Klientic enquiry from ${f.name || 'website'}`);
    const body = encodeURIComponent(`${f.message}\n\n— ${f.name} (${f.email})`);
    window.location.href = `mailto:hello@klientic.com?subject=${subject}&body=${body}`;
  }

  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-5xl gap-12 px-5 md:grid-cols-2">
        <div>
          <h1 className="text-[38px] font-black tracking-tight text-[#16121F]">Let’s talk</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-[#6A6478]">Questions about {BRAND.name}, a demo, or a multi-brand setup? We usually reply within a business day.</p>
          <div className="mt-8 space-y-4">
            <a href="mailto:hello@klientic.com" className="flex items-center gap-3 rounded-2xl border border-[#ECEAF1] p-4 transition hover:border-[#A435E8]">
              <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}><Mail size={20} /></span>
              <div><div className="text-[14px] font-bold text-[#16121F]">Email us</div><div className="text-[13px] text-[#6A6478]">hello@klientic.com</div></div>
            </a>
            <div className="flex items-center gap-3 rounded-2xl border border-[#ECEAF1] p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: 'rgba(164,53,232,.1)', color: '#A435E8' }}><MessageSquare size={20} /></span>
              <div><div className="text-[14px] font-bold text-[#16121F]">Sales &amp; partnerships</div><div className="text-[13px] text-[#6A6478]">Ask about the Scale plan &amp; agencies</div></div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-[#ECEAF1] bg-[#FBFAFD] p-6">
          <div className="mb-4"><label className="mb-1.5 block text-[13px] font-bold text-[#6A6478]">Name</label>
            <input value={f.name} onChange={(e) => set('name', e.target.value)} className="w-full rounded-xl border border-[#E1DEE9] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#A435E8]" /></div>
          <div className="mb-4"><label className="mb-1.5 block text-[13px] font-bold text-[#6A6478]">Email</label>
            <input type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} className="w-full rounded-xl border border-[#E1DEE9] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#A435E8]" /></div>
          <div className="mb-5"><label className="mb-1.5 block text-[13px] font-bold text-[#6A6478]">Message</label>
            <textarea required value={f.message} onChange={(e) => set('message', e.target.value)} className="min-h-[130px] w-full rounded-xl border border-[#E1DEE9] bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#A435E8]" /></div>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-white transition hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 4px 14px rgba(164,53,232,.3)' }}><Send size={15} /> Send message</button>
        </form>
      </div>
    </section>
  );
}

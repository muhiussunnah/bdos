import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { POSTS } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';
import { BlogThumb } from '@/components/marketing/BlogThumb';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Playbooks and thinking on AI-assisted outbound, follow-up cadence and building pipelines that follow themselves up.',
  alternates: { canonical: '/blog' },
  openGraph: { url: '/blog', title: `Blog — ${BRAND.name}` },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogPage() {
  const [lead, ...rest] = POSTS;
  return (
    <>
      <section className="border-b border-[#ECEAF1] bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-[13px] font-bold uppercase tracking-wider text-[#A435E8]">The Klientic blog</div>
          <h1 className="mt-2 text-[38px] font-black tracking-tight text-[#16121F] md:text-[48px]">Outbound, done right</h1>
          <p className="mt-3 max-w-xl text-[16px] text-[#6A6478]">Playbooks and thinking on AI-assisted business development.</p>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-5">
          {/* featured */}
          <Link href={`/blog/${lead.slug}`} className="group grid gap-8 rounded-3xl border border-[#ECEAF1] p-6 transition hover:shadow-[0_20px_50px_rgba(20,18,28,.08)] md:grid-cols-2 md:p-8">
            <BlogThumb post={lead} big className="aspect-[16/10] rounded-2xl" />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[#A435E8]">{lead.category}<span className="text-[#9C97A8]">· {lead.readTime} read</span></div>
              <h2 className="mt-3 text-[26px] font-black leading-tight tracking-tight text-[#16121F] md:text-[30px]">{lead.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#6A6478]">{lead.excerpt}</p>
              <div className="mt-5 flex items-center gap-2 text-[13px] text-[#9C97A8]">{lead.author} · {fmt(lead.date)}</div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#A435E8]">Read article <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
            </div>
          </Link>

          {/* rest */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-2xl border border-[#ECEAF1] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(20,18,28,.08)]">
                <BlogThumb post={p} className="aspect-[16/9]" />
                <div className="p-5">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-[#A435E8]">{p.category} · {p.readTime}</div>
                  <h3 className="mt-2 text-[18px] font-extrabold leading-snug tracking-tight text-[#16121F]">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-[#6A6478]">{p.excerpt}</p>
                  <div className="mt-4 text-[12.5px] text-[#9C97A8]">{fmt(p.date)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

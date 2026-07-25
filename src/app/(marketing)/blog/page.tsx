import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ArrowLeft, Star } from 'lucide-react';
import { POSTS, BLOG_PER_PAGE } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';
import { BlogThumb } from '@/components/marketing/BlogThumb';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Why Klientic is the world’s best client-acquisition engine — deep comparisons, playbooks and the case for making it your must-have growth tool.',
  alternates: { canonical: '/blog' },
  openGraph: { url: '/blog', title: `Blog — ${BRAND.name}` },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Pagination({ cur, pageCount }: { cur: number; pageCount: number }) {
  const href = (n: number) => (n <= 1 ? '/blog' : `/blog?page=${n}`);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const linkCls = 'grid h-10 min-w-10 place-items-center rounded-xl px-3 text-[14px] font-bold transition';
  return (
    <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Blog pagination">
      {cur > 1 ? (
        <Link href={href(cur - 1)} className={`${linkCls} border border-[#ECEAF1] text-[#16121F] hover:bg-[#F4F3F7]`} aria-label="Previous page"><ArrowLeft size={16} /></Link>
      ) : (
        <span className={`${linkCls} border border-[#F1EFF5] text-[#C3BECD]`} aria-disabled><ArrowLeft size={16} /></span>
      )}
      {pages.map((n) =>
        n === cur ? (
          <span key={n} className={`${linkCls} text-white`} style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)', boxShadow: '0 4px 14px rgba(164,53,232,.32)' }} aria-current="page">{n}</span>
        ) : (
          <Link key={n} href={href(n)} className={`${linkCls} border border-[#ECEAF1] text-[#16121F] hover:bg-[#F4F3F7]`}>{n}</Link>
        )
      )}
      {cur < pageCount ? (
        <Link href={href(cur + 1)} className={`${linkCls} border border-[#ECEAF1] text-[#16121F] hover:bg-[#F4F3F7]`} aria-label="Next page"><ArrowRight size={16} /></Link>
      ) : (
        <span className={`${linkCls} border border-[#F1EFF5] text-[#C3BECD]`} aria-disabled><ArrowRight size={16} /></span>
      )}
    </nav>
  );
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const featured = POSTS.find((p) => p.featured) ?? POSTS[0];
  const regular = POSTS.filter((p) => p.slug !== featured.slug);
  const pageCount = Math.max(1, Math.ceil(regular.length / BLOG_PER_PAGE));
  const cur = Math.min(Math.max(1, parseInt(sp.page || '1', 10) || 1), pageCount);
  const slice = regular.slice((cur - 1) * BLOG_PER_PAGE, cur * BLOG_PER_PAGE);

  return (
    <>
      <section className="border-b border-[#ECEAF1] bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-[13px] font-bold uppercase tracking-wider text-[#A435E8]">The Klientic blog</div>
          <h1 className="mt-2 text-[38px] font-black tracking-tight text-[#16121F] md:text-[48px]">Why Klientic wins clients</h1>
          <p className="mt-3 max-w-xl text-[16px] text-[#6A6478]">Deep comparisons, playbooks, and the case for the world’s best client-acquisition engine.</p>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-5">
          {/* Featured — pinned on every page */}
          <Link href={`/blog/${featured.slug}`}
            className="group grid gap-8 rounded-3xl border-2 border-[#EAD9F7] bg-[#FCFAFF] p-6 transition hover:shadow-[0_28px_70px_rgba(164,53,232,.14)] md:grid-cols-2 md:p-8">
            <BlogThumb post={featured} big className="aspect-[16/10] rounded-2xl" />
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>
                <Star size={12} className="fill-white" /> Featured · Must-read
              </div>
              <h2 className="mt-4 text-[26px] font-black leading-tight tracking-tight text-[#16121F] md:text-[32px]">{featured.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#6A6478]">{featured.excerpt}</p>
              <div className="mt-5 flex items-center gap-2 text-[13px] text-[#9C97A8]">{featured.author} · {fmt(featured.date)}</div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#A435E8]">Read article <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
            </div>
          </Link>

          {/* 6 posts per page, 3 per row */}
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {slice.map((p) => (
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

          {pageCount > 1 && <Pagination cur={cur} pageCount={pageCount} />}
        </div>
      </section>
    </>
  );
}

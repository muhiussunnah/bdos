import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, X, Minus, Sparkles } from 'lucide-react';
import { POSTS, getPost, type BlogPost } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';
import { BlogThumb } from '@/components/marketing/BlogThumb';

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: 'Blog' };
  const url = `/blog/${slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: post.title, description: post.excerpt, publishedTime: post.date, authors: [post.author] },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt },
  };
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const GRAD = 'linear-gradient(135deg,#A435E8,#E0457E)';

function Cell({ v, us = false }: { v: string; us?: boolean }) {
  if (v === '✓') return <Check size={18} className="mx-auto" style={{ color: us ? '#16A34A' : '#16A34A' }} />;
  if (v === '✗') return <X size={17} className="mx-auto text-[#E5484D]" />;
  if (v === '—') return <Minus size={16} className="mx-auto text-[#C3BECD]" />;
  return <span className={us ? 'font-bold text-[#16121F]' : 'text-[#6A6478]'}>{v}</span>;
}

function CTA() {
  return (
    <div className="my-9 flex flex-col items-center gap-4 rounded-2xl border-2 border-[#EAD9F7] bg-[#FCFAFF] p-6 text-center sm:flex-row sm:justify-between sm:text-left">
      <div>
        <div className="text-[16.5px] font-black tracking-tight text-[#16121F]">Ready to fill your pipeline on autopilot?</div>
        <div className="mt-0.5 text-[13.5px] text-[#6A6478]">Start free — no card needed. Bring your own AI key.</div>
      </div>
      <div className="flex flex-none gap-2.5">
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white transition hover:-translate-y-0.5" style={{ background: GRAD, boxShadow: '0 8px 22px rgba(164,53,232,.35)' }}>Start free <ArrowRight size={15} /></Link>
        <Link href="/pricing" className="inline-flex items-center rounded-xl border border-[#ECEAF1] px-5 py-2.5 text-[14px] font-bold text-[#16121F] transition hover:bg-[#F4F3F7]">See pricing</Link>
      </div>
    </div>
  );
}

function Block({ b }: { b: BlogPost['body'][number] }) {
  if (b.h) return <h2 className="pt-5 text-[24px] font-black tracking-tight text-[#16121F]">{b.h}</h2>;
  if (b.p) return <p className="text-[17px] leading-[1.75] text-[#3a3546]">{b.p}</p>;
  if (b.list)
    return (
      <ul className="space-y-2.5">
        {b.list.map((li, j) => (
          <li key={j} className="flex gap-3 text-[16.5px] leading-[1.7] text-[#3a3546]">
            <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: GRAD }} />
            <span>{li}</span>
          </li>
        ))}
      </ul>
    );
  if (b.stats)
    return (
      <div className="my-8 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
        {b.stats.map((s, j) => (
          <div key={j} className="rounded-2xl border border-[#ECEAF1] bg-[#FBFAFD] p-4 text-center">
            <div className="text-[27px] font-black leading-none" style={{ background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
            <div className="mt-2 text-[12px] font-medium leading-snug text-[#6A6478]">{s.label}</div>
          </div>
        ))}
      </div>
    );
  if (b.compare)
    return (
      <div className="my-8 overflow-hidden rounded-2xl border border-[#ECEAF1]">
        {b.compare.title && <div className="bg-[#0E0916] px-5 py-3 text-[13px] font-black tracking-tight text-white">{b.compare.title}</div>}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="bg-[#FBFAFD] text-[11.5px] font-bold uppercase tracking-wide text-[#9C97A8]">
                <th className="p-3 text-left font-bold">Capability</th>
                <th className="p-3 text-center font-bold">{b.compare.them}</th>
                <th className="p-3 text-center font-black text-[#A435E8]">Klientic</th>
              </tr>
            </thead>
            <tbody>
              {b.compare.rows.map((r, j) => (
                <tr key={j} className="border-t border-[#F1EFF5]">
                  <td className="p-3 text-left text-[#3a3546]">{r.row}</td>
                  <td className="p-3 text-center">
                    <Cell v={r.them} />
                  </td>
                  <td className="p-3 text-center" style={{ background: 'rgba(164,53,232,.045)' }}>
                    <Cell v={r.us} us />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  if (b.callout)
    return (
      <div className="my-8 rounded-2xl border border-[#EAD9F7] bg-[#FBF5FF] p-5">
        <div className="flex items-center gap-2 text-[15px] font-bold text-[#16121F]"><Sparkles size={17} className="text-[#A435E8]" /> {b.callout.title}</div>
        <p className="mt-2 text-[15px] leading-relaxed text-[#4a4458]">{b.callout.text}</p>
      </div>
    );
  if (b.quote)
    return (
      <blockquote className="my-8 border-l-4 pl-5" style={{ borderColor: '#A435E8' }}>
        <p className="text-[22px] font-black leading-snug tracking-tight text-[#16121F]">“{b.quote}”</p>
      </blockquote>
    );
  if (b.cta) return <CTA />;
  return null;
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const more = POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <>
      <article>
        <header className="relative overflow-hidden py-16 text-center text-white" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #241636 0%, #0E0916 60%)' }}>
          <div className="mx-auto max-w-3xl px-5">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/60 transition hover:text-white"><ArrowLeft size={14} /> All articles</Link>
            <div className="mt-6 text-[13px] font-bold uppercase tracking-wider text-[#E0457E]">{post.category} · {post.readTime} read</div>
            <h1 className="mx-auto mt-3 max-w-2xl text-[32px] font-black leading-tight tracking-tight md:text-[44px]">{post.title}</h1>
            <div className="mt-6 flex items-center justify-center gap-3 text-[14px] text-white/60">
              <span className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-black" style={{ background: GRAD }}>{post.author[0]}</span>
              <span>{post.author} · {post.role}</span><span className="text-white/30">|</span><span>{fmt(post.date)}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-5 py-14">
          <BlogThumb post={post} big className="mb-10 aspect-[16/8] rounded-2xl" />
          <div className="space-y-5">
            {post.body.map((b, i) => <Block key={i} b={b} />)}
          </div>
        </div>
      </article>

      <section className="border-t border-[#ECEAF1] bg-[#FBFAFD] py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-[22px] font-black tracking-tight text-[#16121F]">Keep reading</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {more.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-2xl border border-[#ECEAF1] bg-white transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(20,18,28,.08)]">
                <BlogThumb post={p} className="aspect-[16/6]" />
                <div className="p-5">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-[#A435E8]">{p.category}</div>
                  <h3 className="mt-2 text-[18px] font-extrabold leading-snug tracking-tight text-[#16121F]">{p.title}</h3>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#A435E8]">Read <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

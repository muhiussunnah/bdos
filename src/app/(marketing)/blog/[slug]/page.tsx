import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { POSTS, getPost } from '@/lib/marketing';
import { BRAND } from '@/lib/constants';

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: `Blog — ${BRAND.name}` };
  return { title: `${post.title} — ${BRAND.name}`, description: post.excerpt };
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
              <span className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-black" style={{ background: 'linear-gradient(135deg,#A435E8,#E0457E)' }}>{post.author[0]}</span>
              <span>{post.author} · {post.role}</span><span className="text-white/30">|</span><span>{fmt(post.date)}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-5 py-14">
          <div className="mb-10 aspect-[16/8] rounded-2xl" style={{ background: post.gradient }} />
          <div className="space-y-5">
            {post.body.map((b, i) =>
              b.h ? <h2 key={i} className="pt-4 text-[24px] font-black tracking-tight text-[#16121F]">{b.h}</h2>
                : <p key={i} className="text-[17px] leading-[1.75] text-[#3a3546]">{b.p}</p>
            )}
          </div>
        </div>
      </article>

      <section className="border-t border-[#ECEAF1] bg-[#FBFAFD] py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-[22px] font-black tracking-tight text-[#16121F]">Keep reading</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {more.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-2xl border border-[#ECEAF1] bg-white transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(20,18,28,.08)]">
                <div className="aspect-[16/6]" style={{ background: p.gradient }} />
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

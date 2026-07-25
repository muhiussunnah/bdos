import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Questions about Klientic, a demo, or a multi-brand setup? Get in touch — we usually reply within a business day.',
  alternates: { canonical: '/contact' },
  openGraph: { url: '/contact', title: 'Contact · Klientic' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

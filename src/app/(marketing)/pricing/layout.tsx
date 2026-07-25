import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple pricing — monthly or a one-time lifetime deal. Bring your own AI key and pay model costs at cost. Start free.',
  alternates: { canonical: '/pricing' },
  openGraph: { url: '/pricing', title: 'Pricing · Klientic' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

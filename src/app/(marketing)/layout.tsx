import { MarketingHeader } from '@/components/marketing/Header';
import { MarketingFooter } from '@/components/marketing/Footer';
import { ForceLight } from '@/components/marketing/ForceLight';
import { FloatingUI } from '@/components/marketing/FloatingUI';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#16121F]" style={{ fontFamily: 'var(--font-sans)' }}>
      <ForceLight />
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
      <FloatingUI />
    </div>
  );
}

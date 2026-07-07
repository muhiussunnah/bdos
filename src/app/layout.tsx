import type { Metadata, Viewport } from 'next';
import { Schibsted_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { BRAND } from '@/lib/constants';
import './globals.css';

const sans = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.full}`,
  description: BRAND.tagline,
};

export const viewport: Viewport = {
  themeColor: '#0E0916',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable}`}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--text)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '12px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { BRAND } from '@/lib/constants';
import { Pwa } from '@/components/Pwa';
import './globals.css';

// Variable fonts — one file each, all weights, minimal payload.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const SITE = 'https://klientic.com';
const DESC =
  'Stop chasing leads. Klientic finds your ideal clients, writes the outreach, chases every follow-up, and books the meetings — automatically. One won client pays for the year. Start free, no card.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${BRAND.name} — Win new clients while you sleep`,
    template: `%s · ${BRAND.name}`,
  },
  description: DESC,
  applicationName: BRAND.name,
  keywords: ['client acquisition', 'lead generation', 'AI SDR', 'outbound sales', 'cold email', 'sales automation', 'CRM', 'follow-up automation'],
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: 'en_US',
    url: SITE,
    title: `${BRAND.name} — Win new clients while you sleep`,
    description: DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — Win new clients while you sleep`,
    description: DESC,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/icon-192.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: BRAND.name },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F3F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0710' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable}`}>
        {children}
        <Pwa />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--text)', color: 'var(--bg)', border: 'none',
              borderRadius: '12px', fontFamily: 'var(--font-sans)', fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata } from 'next'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'),
  title: {
    default: 'DealFlow AI - Real Estate Wholesaling Platform',
    template: '%s | DealFlow AI',
  },
  description:
    'The all-in-one real estate wholesaling platform. Find cash buyers, manage deals, automate outreach, analyze properties, and close faster — replacing 5+ tools with one integrated system.',
  keywords: [
    'real estate wholesaling',
    'cash buyer search',
    'wholesale deals',
    'real estate CRM',
    'deal analysis',
    'property wholesaling software',
    'real estate investor tools',
    'wholesale automation',
    'DealFlow AI',
  ],
  openGraph: {
    title: 'DealFlow AI - Real Estate Wholesaling Platform',
    description:
      'Find cash buyers, manage deals, automate outreach, and close faster. The all-in-one platform built for real estate wholesalers.',
    type: 'website',
    siteName: 'DealFlow AI',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealFlow AI - Real Estate Wholesaling Platform',
    description:
      'Find cash buyers, manage deals, automate outreach, and close faster. The all-in-one platform built for real estate wholesalers.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050E24" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}

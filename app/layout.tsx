import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DealFlow AI',
  description: 'Real estate deals, closed on autopilot',
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
      <head />
      <body>{children}</body>
    </html>
  )
}

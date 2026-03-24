import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for every wholesaler. Start free, then choose Starter, Pro, or Enterprise as you scale your real estate business.',
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

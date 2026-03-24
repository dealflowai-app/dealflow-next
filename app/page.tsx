import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import ProductShowcase from '@/components/ProductShowcase'
import LiveDealMap from '@/components/LiveDealMap'
import WhoItsFor from '@/components/WhoItsFor'
import CtaSection from '@/components/CtaSection'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'DealFlow AI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'The all-in-one real estate wholesaling platform. Find cash buyers, manage deals, automate outreach, analyze properties, and close faster.',
  url: 'https://dealflowai.app',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      description: '100 blurred searches, community access, 3 property analyses',
    },
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '149',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '1 market, 500 searches, 300 AI calls, 300 CRM contacts, 5 deals',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '299',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '3 markets, 2500 searches, 1500 AI calls, 3000 contacts, 20 deals',
    },
    {
      '@type': 'Offer',
      name: 'Enterprise',
      price: '499',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: 'Unlimited everything, white-label, custom contracts',
    },
  ],
  publisher: {
    '@type': 'Organization',
    name: 'DealFlow AI',
    url: 'https://dealflowai.app',
  },
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <Hero />
      <ProductShowcase />
      <LiveDealMap />
      <WhoItsFor />
      <CtaSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}

import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import ProductShowcase from '@/components/ProductShowcase'
import LiveDealMap from '@/components/LiveDealMap'
import WhoItsFor from '@/components/WhoItsFor'
import CtaSection from '@/components/CtaSection'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export default function Home() {
  return (
    <>
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

import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
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
      <LiveDealMap />
      <Features />
      <WhoItsFor />
      <CtaSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}

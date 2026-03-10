import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import LiveDealMap from '@/components/LiveDealMap'
import AiCallDemo from '@/components/AiCallDemo'
import BuyerMatchDemo from '@/components/BuyerMatchDemo'
import Platform from '@/components/Platform'
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
      <AiCallDemo />
      <BuyerMatchDemo />
      <Platform />
      <WhoItsFor />
      <CtaSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}

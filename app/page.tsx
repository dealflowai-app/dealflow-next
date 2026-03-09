import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Ticker from '@/components/Ticker'
import MarketStats from '@/components/MarketStats'
import HowItWorks from '@/components/HowItWorks'
import Platform from '@/components/Platform'
import Personas from '@/components/Personas'
import Competitive from '@/components/Competitive'
import WhoItsFor from '@/components/WhoItsFor'
import CtaSection from '@/components/CtaSection'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Ticker />
      <HowItWorks />
      <Platform />
      <Personas />
      <Competitive />
      <WhoItsFor />
      <CtaSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}

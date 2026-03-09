import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Ticker from '@/components/Ticker'
import PropertyStrip from '@/components/PropertyStrip'
import AiCallDemo from '@/components/AiCallDemo'
import BuyerMatchDemo from '@/components/BuyerMatchDemo'
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
      <PropertyStrip />
      <AiCallDemo />
      <BuyerMatchDemo />
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

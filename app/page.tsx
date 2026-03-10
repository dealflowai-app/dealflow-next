import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import AiCallDemo from '@/components/AiCallDemo'
import BuyerMatchDemo from '@/components/BuyerMatchDemo'
import HowItWorks from '@/components/HowItWorks'
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
      <AiCallDemo />
      <BuyerMatchDemo />
      <HowItWorks />
      <Platform />
      <WhoItsFor />
      <CtaSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}

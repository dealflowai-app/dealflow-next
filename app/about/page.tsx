import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import AboutContent from './AboutContent'

export const metadata: Metadata = {
  title: 'About - DealFlow AI',
  description: 'We lost a deal. Then we built the fix.',
}

export default function AboutPage() {
  return (
    <>
      <Nav currentPage="about" />
      <AboutContent />
      <Footer />
      <ScrollReveal />
    </>
  )
}

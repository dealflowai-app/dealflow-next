import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import AboutContent from './AboutContent'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn how DealFlow AI was born from a missed deal and built to become the all-in-one platform for real estate wholesalers.',
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

import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import AboutContent from './AboutContent'

export const metadata: Metadata = {
  title: 'About - Dealflow AI',
  description: 'We lost a deal. Then we built the fix.',
}

export default function AboutPage() {
  return (
    <>
      <Nav isAbout />
      <AboutContent />
      <Footer />
    </>
  )
}

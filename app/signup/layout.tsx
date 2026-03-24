import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Started',
  description:
    'Create your free DealFlow AI account and start finding cash buyers, analyzing deals, and closing faster.',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

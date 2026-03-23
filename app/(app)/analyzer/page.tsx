'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Legacy /analyzer route — redirects to /deals/analyze
 * All analyzer functionality lives at /deals/analyze now.
 */
export default function AnalyzerRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = searchParams.toString()
    router.replace(`/deals/analyze${params ? `?${params}` : ''}`)
  }, [router, searchParams])

  return null
}

import { PageSkeleton, CardGridSkeleton } from '@/components/LoadingSkeleton'

export default function MarketplaceLoading() {
  return <PageSkeleton><CardGridSkeleton count={6} /></PageSkeleton>
}

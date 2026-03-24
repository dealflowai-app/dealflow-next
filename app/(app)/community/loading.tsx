import { PageSkeleton, CardGridSkeleton } from '@/components/LoadingSkeleton'

export default function CommunityLoading() {
  return <PageSkeleton><CardGridSkeleton count={4} /></PageSkeleton>
}

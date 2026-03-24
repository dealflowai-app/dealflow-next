import { PageSkeleton, PipelineSkeleton } from '@/components/LoadingSkeleton'

export default function DealsLoading() {
  return <PageSkeleton><PipelineSkeleton columns={4} /></PageSkeleton>
}

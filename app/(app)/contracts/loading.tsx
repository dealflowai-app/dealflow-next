import { PageSkeleton, PipelineSkeleton } from '@/components/LoadingSkeleton'

export default function ContractsLoading() {
  return <PageSkeleton><PipelineSkeleton columns={4} /></PageSkeleton>
}

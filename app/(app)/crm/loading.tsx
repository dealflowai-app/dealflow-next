import { PageSkeleton, TableSkeleton } from '@/components/LoadingSkeleton'

export default function CRMLoading() {
  return <PageSkeleton><TableSkeleton rows={10} cols={6} /></PageSkeleton>
}

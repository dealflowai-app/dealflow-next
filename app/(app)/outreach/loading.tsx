import { PageSkeleton, TableSkeleton } from '@/components/LoadingSkeleton'

export default function OutreachLoading() {
  return <PageSkeleton><TableSkeleton rows={8} cols={7} /></PageSkeleton>
}

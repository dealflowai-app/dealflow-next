import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6" style={{ fontFamily: FONT }}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-7 w-48" />
        <Skeleton variant="rect" className="h-9 w-32 rounded-lg" />
      </div>

      {/* KPI cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="space-y-3">
              <SkeletonRow>
                <Skeleton variant="circle" className="h-9 w-9" />
                <Skeleton variant="text" className="h-3.5 w-20" />
              </SkeletonRow>
              <Skeleton variant="text" className="h-8 w-24" />
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Revenue graph + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue graph */}
        <SkeletonCard className="lg:col-span-2 space-y-4">
          <SkeletonRow className="justify-between">
            <Skeleton variant="text" className="h-5 w-32" />
            <Skeleton variant="rect" className="h-8 w-28 rounded-lg" />
          </SkeletonRow>
          <Skeleton variant="rect" className="h-64 w-full rounded-lg" />
        </SkeletonCard>

        {/* Activity feed */}
        <SkeletonCard className="space-y-4">
          <Skeleton variant="text" className="h-5 w-28" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i}>
                <Skeleton variant="circle" className="h-8 w-8" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" className="h-3.5 w-3/4" />
                  <Skeleton variant="text" className="h-3 w-1/2" />
                </div>
              </SkeletonRow>
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* Quick-actions row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="space-y-3">
              <Skeleton variant="text" className="h-4 w-28" />
              <Skeleton variant="text" className="h-3 w-full" />
              <Skeleton variant="text" className="h-3 w-2/3" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}

import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function DealsLoading() {
  return (
    <div className="p-6 space-y-5" style={{ fontFamily: FONT }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-7 w-28" />
        <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--dash-card-border)' }}>
        {['w-14', 'w-16', 'w-24', 'w-16', 'w-14'].map((w, i) => (
          <Skeleton key={i} variant="text" className={`h-4 ${w} mb-3`} />
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3">
        <Skeleton variant="rect" className="h-9 flex-1 max-w-sm rounded-lg" />
        <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
        <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
      </div>

      {/* Deal cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-4">
            {/* Status badge + menu */}
            <SkeletonRow className="justify-between">
              <Skeleton variant="rect" className="h-5 w-20 rounded-full" />
              <Skeleton variant="circle" className="h-6 w-6" />
            </SkeletonRow>
            {/* Address */}
            <div className="space-y-1.5">
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
            {/* Price row */}
            <SkeletonRow className="justify-between">
              <div className="space-y-1">
                <Skeleton variant="text" className="h-3 w-16" />
                <Skeleton variant="text" className="h-5 w-24" />
              </div>
              <div className="space-y-1 text-right">
                <Skeleton variant="text" className="h-3 w-10 ml-auto" />
                <Skeleton variant="text" className="h-5 w-20 ml-auto" />
              </div>
            </SkeletonRow>
            {/* Footer */}
            <div
              className="pt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--dash-card-border)' }}
            >
              <Skeleton variant="text" className="h-3 w-24" />
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}

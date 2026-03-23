import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function CRMLoading() {
  return (
    <div className="p-6 space-y-5" style={{ fontFamily: FONT }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-7 w-36" />
        <div className="flex items-center gap-3">
          <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
          <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Filter / search bar */}
      <SkeletonCard className="!p-3">
        <div className="flex items-center gap-3">
          <Skeleton variant="rect" className="h-9 flex-1 rounded-lg" />
          <Skeleton variant="rect" className="h-9 w-24 rounded-lg" />
          <Skeleton variant="rect" className="h-9 w-24 rounded-lg" />
          <Skeleton variant="rect" className="h-9 w-24 rounded-lg" />
        </div>
      </SkeletonCard>

      {/* Table */}
      <SkeletonCard className="!p-0 overflow-hidden">
        {/* Table header */}
        <div
          className="flex items-center gap-4 px-5 py-3"
          style={{ borderBottom: '1px solid var(--dash-card-border)' }}
        >
          <Skeleton variant="rect" className="h-4 w-4 rounded" />
          <Skeleton variant="text" className="h-3.5 w-28" />
          <Skeleton variant="text" className="h-3.5 w-20" />
          <Skeleton variant="text" className="h-3.5 w-20" />
          <Skeleton variant="text" className="h-3.5 w-16 ml-auto" />
          <Skeleton variant="text" className="h-3.5 w-16" />
          <Skeleton variant="text" className="h-3.5 w-16" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-3.5"
            style={{
              borderBottom:
                i < 7 ? '1px solid var(--dash-card-border)' : 'none',
            }}
          >
            <Skeleton variant="rect" className="h-4 w-4 rounded shrink-0" />
            <SkeletonRow className="flex-1">
              <Skeleton variant="circle" className="h-8 w-8" />
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="text" className="h-3.5 w-32" />
                <Skeleton variant="text" className="h-3 w-44" />
              </div>
            </SkeletonRow>
            <Skeleton variant="rect" className="h-5 w-16 rounded-full" />
            <Skeleton variant="text" className="h-3.5 w-20" />
            <Skeleton variant="text" className="h-3.5 w-16" />
            <Skeleton variant="circle" className="h-7 w-7" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}

import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function MarketplaceLoading() {
  return (
    <div className="p-6 space-y-6" style={{ fontFamily: FONT }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-7 w-40" />
        <Skeleton variant="rect" className="h-9 w-32 rounded-lg" />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <Skeleton variant="rect" className="h-10 flex-1 max-w-md rounded-lg" />
        <Skeleton variant="rect" className="h-10 w-28 rounded-lg" />
        <Skeleton variant="rect" className="h-10 w-28 rounded-lg" />
      </div>

      {/* Listing cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-4">
            {/* Image placeholder */}
            <Skeleton variant="rect" className="h-40 w-full rounded-lg" />
            {/* Title + location */}
            <div className="space-y-1.5">
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
            {/* Price + details */}
            <SkeletonRow className="justify-between">
              <Skeleton variant="text" className="h-5 w-24" />
              <Skeleton variant="rect" className="h-5 w-16 rounded-full" />
            </SkeletonRow>
            {/* Footer */}
            <div
              className="pt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--dash-card-border)' }}
            >
              <SkeletonRow>
                <Skeleton variant="circle" className="h-6 w-6" />
                <Skeleton variant="text" className="h-3 w-20" />
              </SkeletonRow>
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}

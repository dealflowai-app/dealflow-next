import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function DiscoveryLoading() {
  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
      {/* Search bar */}
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--dash-card-border)' }}>
        <Skeleton variant="rect" className="h-10 flex-1 max-w-lg rounded-lg" />
        <Skeleton variant="rect" className="h-10 w-28 rounded-lg" />
        <Skeleton variant="rect" className="h-10 w-28 rounded-lg" />
        <Skeleton variant="rect" className="h-10 w-10 rounded-lg" />
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map placeholder (left) */}
        <div
          className="hidden lg:block flex-1"
          style={{ background: 'var(--gray-100, #f3f4f6)' }}
        >
          <div className="h-full w-full animate-pulse flex items-center justify-center">
            <div className="text-center space-y-3">
              <Skeleton variant="circle" className="h-12 w-12 mx-auto" />
              <Skeleton variant="text" className="h-3 w-24 mx-auto" />
            </div>
          </div>
        </div>

        {/* Property list (right) */}
        <div
          className="w-full lg:w-[420px] shrink-0 overflow-y-auto p-4 space-y-3"
          style={{ borderLeft: '1px solid var(--dash-card-border)' }}
        >
          {/* Results count */}
          <Skeleton variant="text" className="h-3.5 w-32 mb-2" />

          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="space-y-3">
              <SkeletonRow>
                <Skeleton variant="rect" className="h-16 w-16 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" className="h-4 w-3/4" />
                  <Skeleton variant="text" className="h-3 w-1/2" />
                  <SkeletonRow>
                    <Skeleton variant="text" className="h-3 w-12" />
                    <Skeleton variant="text" className="h-3 w-12" />
                    <Skeleton variant="text" className="h-3 w-16" />
                  </SkeletonRow>
                </div>
              </SkeletonRow>
              <SkeletonRow className="justify-between">
                <Skeleton variant="rect" className="h-5 w-16 rounded-full" />
                <Skeleton variant="text" className="h-3 w-20" />
              </SkeletonRow>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  )
}

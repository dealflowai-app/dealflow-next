import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function CommunityLoading() {
  return (
    <div className="p-6" style={{ fontFamily: FONT }}>
      <div className="flex gap-6 max-w-6xl mx-auto">
        {/* Main feed */}
        <div className="flex-1 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="h-7 w-36" />
            <Skeleton variant="rect" className="h-9 w-28 rounded-lg" />
          </div>

          {/* Compose box */}
          <SkeletonCard>
            <SkeletonRow>
              <Skeleton variant="circle" className="h-10 w-10" />
              <Skeleton variant="rect" className="h-10 flex-1 rounded-lg" />
            </SkeletonRow>
          </SkeletonCard>

          {/* Post cards */}
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="space-y-4">
              {/* Author row */}
              <SkeletonRow>
                <Skeleton variant="circle" className="h-10 w-10" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" className="h-4 w-32" />
                  <Skeleton variant="text" className="h-3 w-20" />
                </div>
                <Skeleton variant="circle" className="h-6 w-6" />
              </SkeletonRow>
              {/* Content */}
              <div className="space-y-2">
                <Skeleton variant="text" className="h-3.5 w-full" />
                <Skeleton variant="text" className="h-3.5 w-full" />
                <Skeleton variant="text" className="h-3.5 w-2/3" />
              </div>
              {/* Actions */}
              <div
                className="pt-3 flex items-center gap-6"
                style={{ borderTop: '1px solid var(--dash-card-border)' }}
              >
                <Skeleton variant="text" className="h-4 w-14" />
                <Skeleton variant="text" className="h-4 w-14" />
                <Skeleton variant="text" className="h-4 w-14" />
              </div>
            </SkeletonCard>
          ))}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-72 shrink-0 space-y-5">
          {/* Your profile card */}
          <SkeletonCard className="space-y-3">
            <Skeleton variant="text" className="h-4 w-24" />
            <SkeletonRow>
              <Skeleton variant="circle" className="h-10 w-10" />
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="text" className="h-4 w-28" />
                <Skeleton variant="text" className="h-3 w-20" />
              </div>
            </SkeletonRow>
          </SkeletonCard>

          {/* Trending / groups */}
          <SkeletonCard className="space-y-3">
            <Skeleton variant="text" className="h-4 w-28" />
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i}>
                <Skeleton variant="circle" className="h-8 w-8" />
                <Skeleton variant="text" className="h-3.5 w-32" />
              </SkeletonRow>
            ))}
          </SkeletonCard>

          {/* Announcements */}
          <SkeletonCard className="space-y-3">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-3 w-full" />
            <Skeleton variant="text" className="h-3 w-3/4" />
          </SkeletonCard>
        </div>
      </div>
    </div>
  )
}

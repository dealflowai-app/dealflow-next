import Skeleton, { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function SettingsLoading() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8" style={{ fontFamily: FONT }}>
      {/* Header */}
      <div className="space-y-1">
        <Skeleton variant="text" className="h-7 w-28" />
        <Skeleton variant="text" className="h-4 w-64" />
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--dash-card-border)' }}>
        {['w-16', 'w-16', 'w-24', 'w-20', 'w-14'].map((w, i) => (
          <Skeleton key={i} variant="text" className={`h-4 ${w} mb-3`} />
        ))}
      </div>

      {/* Profile section */}
      <SkeletonCard className="space-y-6">
        <Skeleton variant="text" className="h-5 w-24" />

        {/* Avatar */}
        <SkeletonRow>
          <Skeleton variant="circle" className="h-16 w-16" />
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-3 w-48" />
          </div>
        </SkeletonRow>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="text" className="h-3.5 w-24" />
              <Skeleton variant="rect" className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>

        {/* Full-width fields */}
        <div className="space-y-2">
          <Skeleton variant="text" className="h-3.5 w-16" />
          <Skeleton variant="rect" className="h-24 w-full rounded-lg" />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Skeleton variant="rect" className="h-10 w-28 rounded-lg" />
        </div>
      </SkeletonCard>

      {/* Preferences section */}
      <SkeletonCard className="space-y-5">
        <Skeleton variant="text" className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonRow key={i} className="justify-between">
            <div className="space-y-1.5">
              <Skeleton variant="text" className="h-4 w-36" />
              <Skeleton variant="text" className="h-3 w-56" />
            </div>
            <Skeleton variant="rect" className="h-6 w-11 rounded-full" />
          </SkeletonRow>
        ))}
      </SkeletonCard>
    </div>
  )
}

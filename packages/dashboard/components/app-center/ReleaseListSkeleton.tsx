import { Skeleton } from '@/components/ui/skeleton'

const RELEASES = 3

/**
 * Release headers in the shape `ReleaseAccordion` draws them closed: chevron, version, build count.
 * Decorative only — the caller keeps the "Loading…" text for a screen reader beside it.
 */
export function ReleaseListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: RELEASES }, (_, i) => (
        <div key={i} className="rounded-lg shadow-card-2 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-card">
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}

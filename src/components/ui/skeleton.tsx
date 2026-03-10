import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  )
}

function MetricCardSkeleton({ hero = false }: { hero?: boolean }) {
  if (hero) {
    return (
      <div className="rounded-xl border bg-card p-8 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
        </div>
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  )
}

function ItemCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  )
}

function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <CardSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export { Skeleton, CardSkeleton, MetricCardSkeleton, ChartSkeleton, ItemCardSkeleton, PageSkeleton }

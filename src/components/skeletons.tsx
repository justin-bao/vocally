import { cn } from "@/lib/utils";

export function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function SkeletonText({
  width = "w-full",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return <div className={cn("skeleton h-3.5 rounded-md", width, className)} />;
}

/** Generic list of card placeholders that mimic typical row content. */
export function SkeletonList({
  count = 4,
  withAvatar = true,
  className,
}: {
  count?: number;
  withAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl bg-card p-4 card-pop"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-3">
            {withAvatar && <SkeletonBox className="h-14 w-14 rounded-2xl" />}
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonText width="w-3/5" />
              <SkeletonText width="w-2/5" className="h-3" />
            </div>
            <SkeletonBox className="h-9 w-12 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hero/stat card placeholder. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-3xl bg-card p-5 card-pop space-y-3", className)}>
      <SkeletonText width="w-1/3" className="h-3" />
      <SkeletonText width="w-3/4" className="h-5" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonText key={i} width={i % 2 === 0 ? "w-full" : "w-2/3"} />
      ))}
    </div>
  );
}

/** Grid of small stat tiles. */
export function SkeletonStatGrid({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card p-4 card-pop space-y-2">
          <SkeletonText width="w-1/2" className="h-3" />
          <SkeletonText width="w-3/4" className="h-6" />
        </div>
      ))}
    </div>
  );
}

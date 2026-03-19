interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

export function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden p-4">
      <Skeleton className="w-full aspect-square rounded-lg mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className ?? "w-full"}`} />;
}

export function SkeletonImage({ className }: SkeletonProps) {
  return <Skeleton className={`aspect-square w-full ${className ?? ""}`} />;
}

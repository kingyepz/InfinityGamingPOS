
import { Skeleton } from "@/components/ui/skeleton";

export const StationSkeleton = () => {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[125px] w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
};

export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array(4).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
};

export const SessionSkeleton = () => {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[60px] w-full rounded-lg" />
      <Skeleton className="h-[60px] w-full rounded-lg" />
      <Skeleton className="h-[60px] w-full rounded-lg" />
    </div>
  );
};

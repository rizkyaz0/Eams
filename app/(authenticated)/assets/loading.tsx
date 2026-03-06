import { Skeleton } from "@/components/ui/skeleton";

export default function AssetsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      {/* Table rows */}
      <div className="space-y-3 mt-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

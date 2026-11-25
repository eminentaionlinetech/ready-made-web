import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12" role="status" aria-label="Loading page">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-10 w-2/3 max-w-md motion-reduce:animate-none" />
      <Skeleton className="mt-4 h-5 w-1/2 max-w-sm motion-reduce:animate-none" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <Skeleton className="aspect-[3/2] w-full motion-reduce:animate-none" />
            <Skeleton className="mt-4 h-6 w-2/3 motion-reduce:animate-none" />
            <Skeleton className="mt-2 h-4 w-1/2 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

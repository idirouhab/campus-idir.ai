import { HTMLAttributes } from 'react';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      {...props}
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Cover Image Skeleton */}
      <Skeleton className="h-48 w-full rounded-none" />

      <div className="p-6 space-y-4">
        {/* Language and Status badges */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Title */}
        <Skeleton className="h-7 w-3/4" />

        {/* Description lines */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>

        {/* Access Course link */}
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}

export function CourseHeaderSkeleton() {
  return (
    <div className="space-y-4 mb-6 animate-pulse">
      {/* Title */}
      <Skeleton className="h-9 w-96 max-w-full" />

      {/* Description */}
      <Skeleton className="h-6 w-64 max-w-full" />
    </div>
  );
}

export function SessionsListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-l-4 border-emerald-500 pl-6 pb-6 relative">
          {/* Timeline dot */}
          <div className="absolute left-[-8px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white"></div>

          {/* Session header */}
          <div className="mb-3 space-y-3">
            <Skeleton className="h-7 w-64" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 mb-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>

          {/* Button */}
          <Skeleton className="h-12 w-48" />
        </div>
      ))}
    </div>
  );
}

export function MaterialsListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Icon */}
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />

          {/* File info */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Download button */}
          <Skeleton className="h-11 w-28 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

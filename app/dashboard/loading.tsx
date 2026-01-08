import { CourseCardSkeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Page Title Skeleton */}
        <div className="mb-6 md:mb-8 animate-pulse">
          <div className="h-9 bg-gray-200 rounded-md w-80 max-w-full mb-2" />
          <div className="h-6 bg-gray-200 rounded-md w-64 max-w-full" />
        </div>

        {/* Course Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </main>
    </div>
  );
}

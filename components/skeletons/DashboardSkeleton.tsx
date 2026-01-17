/**
 * Skeleton loader for dashboard pages
 * Provides content-aware loading state for course grid layout
 */

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Page title skeleton */}
        <div className="mb-6 md:mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>

        {/* Course grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* Cover image skeleton */}
              <div className="h-48 bg-gray-200"></div>

              {/* Card content */}
              <div className="p-6 space-y-4">
                {/* Status badges skeleton */}
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>

                {/* Title skeleton */}
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-full"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>

                {/* Description skeleton */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>

                {/* Action button skeleton */}
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

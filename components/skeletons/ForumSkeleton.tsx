/**
 * Skeleton loader for forum pages
 * Provides content-aware loading state for forum post list
 */

export default function ForumSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
        {/* Back link skeleton */}
        <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Warning banner skeleton */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>

        {/* Posts list skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
            >
              {/* Post header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                {i % 3 === 0 && (
                  <div className="h-5 w-16 bg-emerald-100 rounded"></div>
                )}
              </div>

              {/* Post preview */}
              <div className="mb-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>

              {/* Post stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

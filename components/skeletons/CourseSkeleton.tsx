/**
 * Skeleton loader for course pages
 * Provides content-aware loading state that matches the actual course layout
 */

export default function CourseSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Back link skeleton */}
        <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>

        {/* Course header skeleton */}
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mt-2"></div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Materials section skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-6 h-6 bg-gray-200 rounded flex-shrink-0"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions section skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Right column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm sticky top-24">
              {/* Instructors skeleton */}
              <div className="mb-4">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info items skeleton */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gray-200 rounded flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description skeleton */}
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

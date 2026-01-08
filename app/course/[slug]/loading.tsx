import { Skeleton, CourseHeaderSkeleton, SessionsListSkeleton, MaterialsListSkeleton } from '@/components/ui/Skeleton';

export default function CourseLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Back to Dashboard Link Skeleton */}
        <div className="mb-4 animate-pulse">
          <Skeleton className="h-5 w-40" />
        </div>

        {/* Course Header Skeleton */}
        <CourseHeaderSkeleton />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Overview Card */}
            <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-6 shadow-sm">
              <Skeleton className="h-7 w-48 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>

              {/* Forum CTA Skeleton */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
                  <Skeleton className="h-5 w-full mb-4" />
                  <Skeleton className="h-12 w-48" />
                </div>
              </div>
            </div>

            {/* Course Materials Card */}
            <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-6 h-6" />
                <Skeleton className="h-7 w-48" />
              </div>
              <MaterialsListSkeleton />
            </div>

            {/* Course Sessions Card */}
            <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Skeleton className="w-6 h-6" />
                <Skeleton className="h-7 w-48" />
              </div>
              <SessionsListSkeleton />
            </div>
          </div>

          {/* Sidebar - Right Column (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Course Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <Skeleton className="h-6 w-40 mb-3" />
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Skeleton className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

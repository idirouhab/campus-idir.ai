'use client';

import { CourseMaterial } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';

type CourseMaterialsProps = {
  materials: CourseMaterial[];
  isLoading: boolean;
  courseId?: string;
  showOnlyCourseMaterials?: boolean;
};

export default function CourseMaterials({
  materials,
  isLoading,
  showOnlyCourseMaterials = true,
}: CourseMaterialsProps) {
  const { t } = useLanguage();

  // Filter materials if needed
  const displayMaterials = showOnlyCourseMaterials
    ? materials.filter((m) => !m.session_id)
    : materials;

  if (displayMaterials.length === 0) {
    return null;
  }

  const getFileIcon = (material: CourseMaterial) => {
    // Check if it's a link resource
    if (material.resource_type === 'link') {
      return (
        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      );
    }

    switch (material.file_type.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'ppt':
      case 'pptx':
        return (
          <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <h2 className="text-xl font-bold text-gray-900">{t('course.generalMaterials')}</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-500 mt-4">{t('course.loadingMaterials')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayMaterials.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">{getFileIcon(material)}</div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
                  {material.display_filename}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {material.file_type.toUpperCase()} • {formatFileSize(material.file_size_bytes)}
                </p>
              </div>

              {/* Download/View Button */}
              {material.resource_type === 'link' && material.external_link_url ? (
                <a
                  href={material.external_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title={t('course.visitLink')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ) : (
                <a
                  href={material.file_url || '#'}
                  download
                  className="flex-shrink-0 p-2 text-[#10b981] hover:bg-emerald-50 rounded-lg transition-colors"
                  title={t('course.downloadFile')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

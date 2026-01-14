'use client';

import { useState, useEffect } from 'react';
import { CourseSession, CourseMaterial } from '@/types/database';
import { Calendar, Clock, FileText, Download, Video, Play, Link2, ExternalLink, File, Presentation, FileImage } from 'lucide-react';
import { formatSessionDateLong, formatDuration } from '@/lib/timezone-utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface SessionsListProps {
  sessions: CourseSession[];
  courseId: string;
}

// Helper to format file size
function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Helper to get file type color
function getFileTypeColor(fileType: string): string {
  const colors: Record<string, string> = {
    pdf: 'text-red-600 bg-red-50',
    doc: 'text-blue-600 bg-blue-50',
    docx: 'text-blue-600 bg-blue-50',
    ppt: 'text-orange-600 bg-orange-50',
    pptx: 'text-orange-600 bg-orange-50',
  };
  return colors[fileType.toLowerCase()] || 'text-gray-600 bg-gray-50';
}

// Helper to get file type icon
function getFileTypeIcon(fileType: string) {
  const type = fileType?.toLowerCase() || '';

  // Use distinct icons for each file type with color coding
  if (type === 'pdf') {
    return <FileText size={20} className="text-red-600" />;
  } else if (type === 'doc' || type === 'docx') {
    return <File size={20} className="text-blue-600" />;
  } else if (type === 'ppt' || type === 'pptx') {
    return <Presentation size={20} className="text-orange-600" />;
  } else {
    return <FileText size={20} className="text-gray-600" />;
  }
}

export default function SessionsList({ sessions, courseId }: SessionsListProps) {
  const [materialsMap, setMaterialsMap] = useState<Record<string, CourseMaterial[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const { language, t } = useLanguage();

  // Map language code to locale
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  // Fetch materials for all sessions
  useEffect(() => {
    const fetchMaterials = async () => {
      if (sessions.length === 0) return;

      setLoadingMaterials(true);
      try {
        const response = await fetch(`/api/courses/${courseId}/materials/public`);
        const data = await response.json();

        if (data.success && data.materials) {
          // Group materials by session_id
          const grouped: Record<string, CourseMaterial[]> = {};
          data.materials.forEach((material: CourseMaterial) => {
            if (material.session_id) {
              if (!grouped[material.session_id]) {
                grouped[material.session_id] = [];
              }
              grouped[material.session_id].push(material);
            }
          });

          setMaterialsMap(grouped);
        }
      } catch (error) {
        console.error('Error fetching session materials:', error);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [sessions, courseId]);

  if (sessions.length === 0) {
    return null;
  }

  // Sort sessions by display_order, then by date
  const sortedSessions = [...sessions].sort((a, b) => {
    // First sort by display_order
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    // If display_order is the same, sort by date
    return new Date(a.session_date).getTime() - new Date(b.session_date).getTime();
  });

  return (
    <div className="space-y-6">
      {sortedSessions.map((session, index) => {
        const sessionMaterials = materialsMap[session.id] || [];
        const isPast = new Date(session.session_date) < new Date();

        return (
          <div
            key={session.id}
            className="border-l-4 border-emerald-500 pl-6 pb-6 relative"
          >
            {/* Timeline dot */}
            <div className="absolute left-[-8px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white"></div>

            {/* Session Header */}
            <div className="mb-3">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-xl font-bold text-gray-900">
                  Session {index + 1}: {session.title}
                </h3>
                {isPast && (
                  <span className="px-3 py-1.5 text-sm font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                    {t('course.completed')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-base text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-600" />
                  <span className="font-medium">{formatSessionDateLong(session.session_date, session.timezone, locale)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-emerald-600" />
                  <span className="font-medium">{formatDuration(session.duration_minutes)}</span>
                </div>
              </div>
            </div>

            {/* Session Description */}
            {session.description && (
              <p className="text-gray-700 mb-4 leading-relaxed">{session.description}</p>
            )}

            {/* Session Link - Priority: Recording > Meeting URL */}
            {(session.recording_link || session.meeting_url) && (
              <div className="mb-4">
                <a
                  href={session.recording_link || session.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-base min-h-[48px] shadow-sm hover:shadow-md"
                >
                  {session.recording_link ? (
                    <>
                      <Play size={18} />
                      {t('course.watchRecording')}
                    </>
                  ) : (
                    <>
                      <Video size={18} />
                      {t('course.joinVideoSession')}
                    </>
                  )}
                </a>
              </div>
            )}

            {/* Session Materials */}
            {loadingMaterials ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-emerald-600"></div>
                {t('course.loadingMaterialsEllipsis')}
              </div>
            ) : sessionMaterials.length > 0 ? (
              <div className="bg-gray-50 rounded p-2.5 border border-gray-200">
                <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-600" />
                  {t('course.sessionMaterials')} ({sessionMaterials.length})
                </h4>
                <div className="space-y-1.5">
                  {sessionMaterials.map((material) => (
                    <a
                      key={material.id}
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-gray-200 hover:border-emerald-500 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`p-1 rounded ${
                            material.resource_type === 'link'
                              ? 'text-emerald-600 bg-emerald-50'
                              : getFileTypeColor(material.file_type)
                          }`}
                        >
                          {material.resource_type === 'link' ? (
                            <Link2 size={14} />
                          ) : (
                            getFileTypeIcon(material.file_type)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors leading-tight">
                            {material.display_filename}
                          </p>
                          <p className="text-xs text-gray-600 leading-tight">
                            {material.resource_type === 'link'
                              ? 'Google Drive'
                              : `${material.file_type.toUpperCase()} • ${formatFileSize(material.file_size_bytes)}`
                            }
                          </p>
                        </div>
                      </div>
                      {material.resource_type === 'link' ? (
                        <ExternalLink
                          size={14}
                          className="text-gray-400 group-hover:text-emerald-600 flex-shrink-0"
                        />
                      ) : (
                        <Download
                          size={14}
                          className="text-gray-400 group-hover:text-emerald-600 flex-shrink-0"
                        />
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 italic">
                {t('course.noMaterialsForSession')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

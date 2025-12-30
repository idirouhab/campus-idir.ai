'use client';

import { useState, useEffect } from 'react';
import { CourseSession, CourseMaterial } from '@/types/database';
import { Calendar, Clock, FileText, Download } from 'lucide-react';
import { formatSessionDateLong, formatDuration } from '@/lib/timezone-utils';

interface SessionsListProps {
  sessions: CourseSession[];
  courseId: string;
}

// Helper to format file size
function formatFileSize(bytes: number): string {
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

export default function SessionsList({ sessions, courseId }: SessionsListProps) {
  const [materialsMap, setMaterialsMap] = useState<Record<string, CourseMaterial[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState(false);

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

  // Sort sessions by date
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );

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
                  <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                    Completed
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-emerald-600" />
                  <span>{formatSessionDateLong(session.session_date, session.timezone)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-emerald-600" />
                  <span>{formatDuration(session.duration_minutes)}</span>
                </div>
              </div>
            </div>

            {/* Session Description */}
            {session.description && (
              <p className="text-gray-700 mb-4 leading-relaxed">{session.description}</p>
            )}

            {/* Session Materials */}
            {loadingMaterials ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-600"></div>
                Loading materials...
              </div>
            ) : sessionMaterials.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" />
                  Session Materials ({sessionMaterials.length})
                </h4>
                <div className="space-y-2">
                  {sessionMaterials.map((material) => (
                    <a
                      key={material.id}
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-500 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${getFileTypeColor(material.file_type)}`}
                        >
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                            {material.display_filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {material.file_type.toUpperCase()} • {formatFileSize(material.file_size_bytes)}
                          </p>
                        </div>
                      </div>
                      <Download
                        size={18}
                        className="text-gray-400 group-hover:text-emerald-600 flex-shrink-0"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No materials uploaded for this session yet.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useInstructorAuth } from '@/hooks/useInstructorAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { CourseMaterial } from '@/types/database';
import MaterialItem from '@/components/courses/MaterialItem';
import { getCourseByIdAction } from '@/lib/course-actions';

export default function ManageCourseMaterialsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const { instructor: currentInstructor, loading: authLoading, csrfToken } = useInstructorAuth();
  const { t } = useLanguage();

  const [courseName, setCourseName] = useState('');
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !currentInstructor) {
      router.push('/instructor/login');
    }
  }, [currentInstructor, authLoading, router]);

  // Fetch course name
  useEffect(() => {
    const fetchCourse = async () => {
      if (!currentInstructor || !courseId) return;

      try {
        const result = await getCourseByIdAction(courseId);
        if (result.success && result.data) {
          setCourseName(result.data.title);
        }
      } catch (err: any) {
        console.error('Error fetching course:', err);
      }
    };

    fetchCourse();
  }, [currentInstructor, courseId]);

  // Fetch course materials
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!currentInstructor || !courseId) return;

      setMaterialsLoading(true);
      try {
        const response = await fetch(`/api/courses/${courseId}/materials`);
        const data = await response.json();
        if (data.success) {
          setMaterials(data.materials || []);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setMaterialsLoading(false);
      }
    };

    fetchMaterials();
  }, [currentInstructor, courseId]);

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
      ];

      if (!allowedTypes.includes(file.type)) {
        setError(`${t('instructor.materials.invalidFileType')} ${file.name}. ${t('instructor.materials.fileTypes')}`);
        setTimeout(() => setError(null), 5000);
        continue;
      }

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError(`${t('instructor.materials.fileTooLarge')} ${file.name}. ${t('instructor.materials.fileTypes')}`);
        setTimeout(() => setError(null), 5000);
        continue;
      }

      // Add to uploading set
      setUploadingFiles(prev => new Set(prev).add(file.name));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', courseId);

        const response = await fetch('/api/upload-course-material', {
          method: 'POST',
          headers: {
            'x-csrf-token': csrfToken || '',
          },
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setMaterials(prev => [...prev, data.material]);
          setSuccess(`${t('instructor.materials.uploadSuccess')} ${file.name}`);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(data.error || t('instructor.materials.uploadError'));
          setTimeout(() => setError(null), 5000);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setError(`${t('instructor.materials.uploadError')} ${file.name}`);
        setTimeout(() => setError(null), 5000);
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          next.delete(file.name);
          return next;
        });
      }
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleMaterialRename = async (materialId: string, newName: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ displayFilename: newName }),
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(prev => prev.map(m => m.id === materialId ? data.material : m));
        setSuccess(t('instructor.materials.renameSuccess'));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || t('instructor.materials.renameError'));
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Rename error:', error);
      setError(t('instructor.materials.renameError'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleMaterialDelete = async (materialId: string) => {
    if (!confirm(t('instructor.sessions.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken || '',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(prev => prev.filter(m => m.id !== materialId));
        setSuccess(t('instructor.materials.deleteSuccess'));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || t('instructor.materials.deleteError'));
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(t('instructor.materials.deleteError'));
      setTimeout(() => setError(null), 5000);
    }
  };

  if (authLoading || !currentInstructor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Header with navigation tabs */}
        <div className="mb-6">
          <Link
            href="/instructor/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#10b981] mb-4 font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('instructor.common.backToDashboard')}
          </Link>
          <h1 className="text-3xl font-black text-gray-900 mb-2">{t('instructor.materials.title')}</h1>
          <p className="text-gray-600 mb-4">{courseName}</p>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/edit`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                {t('instructor.editCourse.tabs.editCourse')}
              </button>
              <button
                className="border-b-2 border-[#10b981] py-4 px-1 text-sm font-medium text-[#10b981]"
              >
                {t('instructor.editCourse.tabs.materials')}
              </button>
              <button
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/sessions`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                {t('instructor.editCourse.tabs.sessions')}
              </button>
              <button
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/students`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                {t('instructor.editCourse.tabs.students')}
              </button>
              <button
                onClick={() => {
                  // Navigate to forum using course slug - need to fetch it first
                  const fetchSlug = async () => {
                    try {
                      const result = await getCourseByIdAction(courseId);
                      if (result.success && result.data) {
                        router.push(`/course/${result.data.slug}/forum`);
                      }
                    } catch (err) {
                      console.error('Error fetching course:', err);
                    }
                  };
                  fetchSlug();
                }}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Forum
              </button>
            </nav>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-emerald-50 border-2 border-[#10b981] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-[#10b981] font-semibold">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-500 rounded-lg p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('instructor.materials.uploadMaterials')}</h2>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-[#10b981] bg-emerald-50'
                : 'border-gray-300 hover:border-[#10b981]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="material-upload"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
              className="hidden"
            />
            <label htmlFor="material-upload" className="cursor-pointer">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg text-gray-700 mb-2">
                <span className="font-semibold text-[#10b981]">{t('instructor.materials.clickToUpload')}</span> {t('instructor.materials.dragAndDrop')}
              </p>
              <p className="text-sm text-gray-500">{t('instructor.materials.fileTypes')}</p>
            </label>
          </div>

          {/* Uploading indicators */}
          {uploadingFiles.size > 0 && (
            <div className="space-y-2 mt-4">
              {Array.from(uploadingFiles).map(filename => (
                <div key={filename} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="animate-spin w-5 h-5 border-2 border-[#10b981] border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-700">{t('instructor.materials.uploading')} {filename}...</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Materials List */}
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('instructor.materials.uploadedMaterials')}</h2>

          {materialsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-500 mt-4">{t('instructor.materials.loadingMaterials')}</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium mb-2">{t('instructor.materials.noMaterials')}</p>
              <p className="text-sm">{t('instructor.materials.noMaterialsMessage')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map(material => (
                <MaterialItem
                  key={material.id}
                  material={material}
                  onRename={handleMaterialRename}
                  onDelete={handleMaterialDelete}
                  isUploading={uploadingFiles.has(material.original_filename)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/instructor/dashboard')}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('instructor.common.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CourseBuilder from '@/components/courses/CourseBuilder';
import { generateCourseSlug } from '@/lib/course-utils';
import { updateCourseAction, getAllInstructorsAction, getCourseByIdAction } from '@/lib/course-actions';
import { useInstructorAuth } from '@/hooks/useInstructorAuth';
import { Instructor } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import imageCompression from 'browser-image-compression';
import Link from 'next/link';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const { t } = useLanguage();
  const { instructor: currentInstructor, loading: authLoading, csrfToken } = useInstructorAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<Array<{
    instructor_id: string;
    display_order: number;
    instructor_role: string;
  }>>([]);
  const [originalStatus, setOriginalStatus] = useState<'draft' | 'published'>('draft');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    short_description: '',
    cover_image: '',
    language: 'en' as 'en' | 'es',
    status: 'draft' as 'draft' | 'published',
    meta_title: '',
    meta_description: '',
  });

  const [courseData, setCourseData] = useState<any>(null);

  // Cover image upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverCompressing, setCoverCompressing] = useState(false);
  const [coverUploadSuccess, setCoverUploadSuccess] = useState(false);

  // Collapsible sections state
  const [sectionsExpanded, setSectionsExpanded] = useState({
    basic: true,
    seo: false,
    content: false,
    instructors: false,
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!authLoading && !currentInstructor) {
      router.push('/instructor/login');
    }
  }, [currentInstructor, authLoading, router]);

  // Fetch all instructors when authenticated
  useEffect(() => {
    const fetchInstructors = async () => {
      if (currentInstructor) {
        try {
          const instructorsResult = await getAllInstructorsAction();
          if (instructorsResult.success && instructorsResult.data) {
            setAllInstructors(instructorsResult.data);
          }
        } catch (error) {
          console.error('Error fetching instructors:', error);
        }
      }
    };

    fetchInstructors();
  }, [currentInstructor]);

  // Fetch existing course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!currentInstructor || !courseId) return;

      try {
        const result = await getCourseByIdAction(courseId);
        if (result.success && result.data) {
          const course = result.data;

          // Populate formData
          setFormData({
            title: course.title,
            slug: course.slug,
            short_description: course.short_description || '',
            cover_image: course.cover_image || '',
            language: course.language,
            status: course.status,
            meta_title: course.meta_title || '',
            meta_description: course.meta_description || '',
          });

          // Populate courseData for CourseBuilder (already parsed by action)
          setCourseData(course.course_data);

          // Track original status for slug protection
          setOriginalStatus(course.status);

          // Populate instructors
          if (course.instructors) {
            setSelectedInstructors(
              course.instructors.map((inst, idx) => ({
                instructor_id: inst.id,
                display_order: inst.display_order || idx,
                instructor_role: inst.instructor_role || 'instructor'
              }))
            );
          }
        } else {
          setError(result.error || 'Course not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load course');
      }
    };

    fetchCourse();
  }, [currentInstructor, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!currentInstructor || !courseId) {
        throw new Error('Not authenticated');
      }

      // Ensure hero title is synced with main title before submission
      const finalCourseData = courseData?.hero ? {
        ...courseData,
        hero: {
          ...courseData.hero,
          title: formData.title
        }
      } : courseData;

      const result = await updateCourseAction(
        courseId,
        {
          ...formData,
          course_data: finalCourseData,
        },
        selectedInstructors
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update course');
      }

      // Success message with auto-hide
      setSuccess('Course updated successfully!');
      setTimeout(() => setSuccess(null), 3000);

      // Redirect to dashboard after 3.5 seconds
      setTimeout(() => router.push('/instructor/dashboard'), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = useCallback((title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      // Only auto-generate slug if course is not published
      slug: originalStatus === 'published' ? prev.slug : generateCourseSlug(title)
    }));
  }, [originalStatus]);

  const handleCourseDataChange = useCallback((data: any) => {
    setCourseData(data);
  }, []);

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCoverCompressing(false);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      let processedFile = file;

      // Compress if larger than 1MB
      if (file.size > 1 * 1024 * 1024) {
        setCoverCompressing(true);
        console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type,
        };

        try {
          processedFile = await imageCompression(file, options);
          console.log(`Compressed file size: ${(processedFile.size / 1024 / 1024).toFixed(2)} MB`);
        } catch (compressionError) {
          console.error('Compression error:', compressionError);
          // Continue with original file if compression fails
        }

        setCoverCompressing(false);
      }

      setCoverFile(processedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image');
      setCoverCompressing(false);
    }
  };

  const handleCoverUpload = async () => {
    if (!coverFile || !currentInstructor || !csrfToken) return;

    setCoverUploading(true);
    setError(null);
    setCoverUploadSuccess(false);

    try {
      // Create form data
      const uploadFormData = new FormData();
      uploadFormData.append('file', coverFile);
      uploadFormData.append('instructorId', currentInstructor.id);
      uploadFormData.append('courseId', courseId);

      // Upload to API route with CSRF token
      const response = await fetch('/api/upload-course-cover', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Update form data with the uploaded URL
      setFormData(prev => ({ ...prev, cover_image: data.url }));
      setCoverPreview('');
      setCoverFile(null);
      setCoverUploadSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setCoverUploadSuccess(false);
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to upload image');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleAddInstructor = (instructorId: string) => {
    if (selectedInstructors.find(i => i.instructor_id === instructorId)) {
      return;
    }
    setSelectedInstructors([
      ...selectedInstructors,
      {
        instructor_id: instructorId,
        display_order: selectedInstructors.length,
        instructor_role: 'instructor'
      }
    ]);
  };

  const handleRemoveInstructor = (instructorId: string) => {
    setSelectedInstructors(
      selectedInstructors
        .filter(i => i.instructor_id !== instructorId)
        .map((i, index) => ({ ...i, display_order: index }))
    );
  };

  const handleUpdateRole = (instructorId: string, role: string) => {
    setSelectedInstructors(
      selectedInstructors.map(i =>
        i.instructor_id === instructorId ? { ...i, instructor_role: role } : i
      )
    );
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
          <h1 className="text-3xl font-black text-gray-900 mb-2">{t('instructor.editCourse.title')}</h1>
          <p className="text-gray-600 mb-4">Update course details and content</p>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                className="border-b-2 border-[#10b981] py-4 px-1 text-sm font-medium text-[#10b981]"
              >
                {t('instructor.editCourse.tabs.editCourse')}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/materials`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                {t('instructor.editCourse.tabs.materials')}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/sessions`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                {t('instructor.editCourse.tabs.sessions')}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/instructor/dashboard/courses/${courseId}/students`)}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                {t('instructor.editCourse.tabs.students')}
              </button>
            </nav>
          </div>
        </div>

        {/* Success Message - Fixed Position */}
        {success && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down max-w-md w-full mx-4">
            <div className="bg-emerald-50 border-2 border-[#10b981] rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-[#10b981] font-semibold">{success}</p>
                  <p className="text-xs text-gray-600 mt-1">Redirecting to dashboard...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('basic')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${sectionsExpanded.basic ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {sectionsExpanded.basic && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  placeholder="Course Title"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Slug * {originalStatus !== 'published' && <span className="text-gray-500 normal-case">(auto-generated)</span>}
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  disabled={originalStatus === 'published'}
                  className={`w-full px-4 py-3 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent ${
                    originalStatus === 'published'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="course-slug"
                />
                <p className="text-xs text-gray-500 mt-1">URL: /course/{formData.slug}</p>
                {originalStatus === 'published' && (
                  <p className="text-xs text-orange-600 mt-1 font-semibold">
                    Slug cannot be changed for published courses to avoid breaking links
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Short Description *
                </label>
                <textarea
                  required
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent resize-none"
                  placeholder="Brief description of the course..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Cover Image
                </label>

                <div className="space-y-3">
                  {/* Success Message */}
                  {coverUploadSuccess && (
                    <div className="rounded-md bg-emerald-50 border border-[#10b981] p-3">
                      <p className="text-sm text-[#10b981] font-semibold">Image uploaded successfully!</p>
                    </div>
                  )}

                  {/* File Input */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="block w-full text-sm text-gray-900 border border-gray-200 rounded-lg cursor-pointer bg-gray-100 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-[#10b981] file:text-white hover:file:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={coverUploading || coverCompressing}
                  />
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB. Images over 1MB will be automatically compressed.
                  </p>

                  {/* Compressing indicator */}
                  {coverCompressing && (
                    <p className="text-xs text-[#10b981] font-semibold flex items-center">
                      <svg className="animate-spin h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Compressing image...
                    </p>
                  )}

                  {/* Preview and Upload button */}
                  {coverPreview && !coverCompressing && (
                    <div className="space-y-3">
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCoverUpload}
                          disabled={coverUploading}
                          className="px-4 py-2 text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                        >
                          {coverUploading ? 'Uploading...' : 'Upload Image'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCoverPreview('');
                            setCoverFile(null);
                            setCoverCompressing(false);
                          }}
                          disabled={coverUploading}
                          className="px-4 py-2 text-sm font-bold rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                        >
                          {t('instructor.common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current uploaded image */}
                  {formData.cover_image && !coverPreview && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 font-semibold">Current Cover Image:</p>
                      <img
                        key={formData.cover_image}
                        src={formData.cover_image}
                        alt="Current cover"
                        className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, cover_image: '' });
                          setCoverUploadSuccess(false);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold"
                      >
                        Remove Image
                      </button>
                    </div>
                  )}

                  {/* Manual URL input (alternative) */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                      Or Enter Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.cover_image}
                      onChange={(e) => {
                        setFormData({ ...formData, cover_image: e.target.value });
                        setCoverUploadSuccess(false);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.cover_image && (
                      <p className="text-xs text-gray-500 mt-1 break-all">
                        <span className="font-semibold">Current URL:</span> {formData.cover_image}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Language *
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as 'en' | 'es' })}
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('seo')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-xl font-bold text-gray-900">SEO (Optional)</h2>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${sectionsExpanded.seo ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {sectionsExpanded.seo && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  placeholder="Course Title | Platform Name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Meta Description
                </label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent resize-none"
                  placeholder="SEO description..."
                />
              </div>
              </div>
            )}
          </div>

          {/* Course Content Builder */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('content')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">Course Content Builder (Optional)</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Use the visual builder below to create your course structure
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${sectionsExpanded.content ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {sectionsExpanded.content && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="pt-6">
                  <CourseBuilder initialData={courseData} onDataChange={handleCourseDataChange} />
                </div>
              </div>
            )}
          </div>

          {/* Instructors */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('instructors')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">Assign Instructors (Optional)</h2>
                <p className="text-sm text-gray-600 mt-1">
                  You can assign one or multiple instructors to this course
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${sectionsExpanded.instructors ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {sectionsExpanded.instructors && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">

            {/* Selected Instructors */}
            {selectedInstructors.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Selected Instructors:</p>
                {selectedInstructors.map((si) => {
                  const instructor = allInstructors.find(i => i.id === si.instructor_id);
                  if (!instructor) return null;
                  return (
                    <div key={si.instructor_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        {instructor.profile?.picture_url ? (
                          <img
                            src={instructor.profile?.picture_url}
                            alt={`${instructor.first_name} ${instructor.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                            <span className="text-sm font-bold text-[#10b981]">
                              {instructor.first_name[0]}{instructor.last_name[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {instructor.first_name} {instructor.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{instructor.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={si.instructor_role}
                          onChange={(e) => handleUpdateRole(si.instructor_id, e.target.value)}
                          className="px-3 py-1 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                        >
                          <option value="instructor">Instructor</option>
                          <option value="lead_instructor">Lead Instructor</option>
                          <option value="teaching_assistant">Teaching Assistant</option>
                          <option value="guest_instructor">Guest Instructor</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveInstructor(si.instructor_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available Instructors */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Add Instructor
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddInstructor(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
              >
                <option value="">Select an instructor...</option>
                {allInstructors
                  .filter(i => !selectedInstructors.find(si => si.instructor_id === i.id))
                  .map(instructor => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.first_name} {instructor.last_name} ({instructor.email})
                    </option>
                  ))}
              </select>
            </div>
            </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-500 rounded-lg p-4 text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors uppercase tracking-wide"
            >
              {t('instructor.common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#10b981] text-white font-bold rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? t('instructor.editCourse.saving') : t('instructor.editCourse.saveChanges')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

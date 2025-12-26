'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CourseBuilder from '@/components/courses/CourseBuilder';
import { generateCourseSlug } from '@/lib/course-utils';
import { createCourseAction, getAllInstructorsAction } from '@/lib/course-actions';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { Instructor } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import Cookies from 'js-cookie';

export default function NewCoursePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentInstructor, setCurrentInstructor] = useState<Instructor | null>(null);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<Array<{
    instructor_id: string;
    display_order: number;
    instructor_role: string;
  }>>([]);

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

  useEffect(() => {
    const checkAuth = async () => {
      const instructorId = Cookies.get('instructorId');
      const userType = Cookies.get('userType');

      if (!instructorId || userType !== 'instructor') {
        router.push('/instructor/login');
        return;
      }

      try {
        const result = await verifyInstructorAction(instructorId);
        if (result.success && result.data) {
          setCurrentInstructor(result.data);

          // Fetch all instructors for assignment
          const instructorsResult = await getAllInstructorsAction(instructorId);
          if (instructorsResult.success && instructorsResult.data) {
            setAllInstructors(instructorsResult.data);
          }
        } else {
          Cookies.remove('instructorId');
          Cookies.remove('userType');
          router.push('/instructor/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/instructor/login');
      } finally {
        setPageLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!currentInstructor) {
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

      const result = await createCourseAction(
        currentInstructor.id,
        {
          ...formData,
          course_data: finalCourseData,
          published_at: formData.status === 'published' ? new Date().toISOString() : undefined,
        },
        selectedInstructors
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create course');
      }

      router.push('/instructor/dashboard');
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
      slug: generateCourseSlug(title)
    }));
  }, []);

  const handleCourseDataChange = useCallback((data: any) => {
    setCourseData(data);
  }, []);

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

  if (pageLoading) {
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Create New Course</h1>
          <p className="text-gray-600">Fill in the details to create a new course</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
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
                  Slug * <span className="text-gray-500 normal-case">(auto-generated)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent font-mono"
                  placeholder="course-slug"
                />
                <p className="text-xs text-gray-500 mt-1">URL: /course/{formData.slug}</p>
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
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.cover_image && (
                  <div className="mt-3">
                    <img
                      src={formData.cover_image}
                      alt="Cover preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
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
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">SEO (Optional)</h2>

            <div className="space-y-4">
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
          </div>

          {/* Course Content Builder */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Course Content Builder (Optional)</h2>
            <p className="text-sm text-gray-600 mb-6">
              Use the visual builder below to create your course structure. Toggle sections on/off and add content dynamically.
              All sections are optional - configure only what you need for your course.
            </p>

            <CourseBuilder onDataChange={handleCourseDataChange} />
          </div>

          {/* Instructors */}
          <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Instructors (Optional)</h2>
            <p className="text-sm text-gray-600 mb-4">
              You can assign one or multiple instructors to this course. Each instructor can have a different role.
            </p>

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
                        {instructor.picture_url ? (
                          <img
                            src={instructor.picture_url}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#10b981] text-white font-bold rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 uppercase tracking-wide"
            >
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

'use client';

import { Course, Instructor } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';
import MarkdownContent from '@/components/MarkdownContent';
import { formatDuration, formatStartDate, formatSchedule, calculateTotalHours } from '@/lib/course-utils';

type CourseInfoSidebarProps = {
  course: Course;
  courseInstructors: Array<Instructor & {  instructor_role: string;
    display_order: number
  }>;
  slug: string;
};

export default function CourseInfoSidebar({
  course,
  courseInstructors,
  slug,
}: CourseInfoSidebarProps) {
  const { t, language } = useLanguage();

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Course Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 sticky top-24 shadow-sm">
        {/* Instructors */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
            {t('course.instructors')}
          </h3>
          {courseInstructors.length > 0 ? (
            <div className="space-y-3">
              {courseInstructors.map((inst) => (
                <div key={inst.id} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    {inst.profile?.picture_url && inst.profile.picture_url.trim() !== '' ? (
                      <Image
                        src={inst.profile.picture_url}
                        alt={inst.first_name}
                        fill
                        sizes="40px"
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-[#10b981]">
                        {inst.first_name[0]}
                        {inst.last_name[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {inst.first_name} {inst.last_name}
                    </p>
                    <p className="text-xs text-gray-600 capitalize">
                      {inst.instructor_role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">{t('course.noInstructors')}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-4">
          {/* Start Date */}
          {course.course_data?.logistics?.startDate && (
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('course.startDate')}</p>
                <p className="text-sm text-gray-700">
                  {formatStartDate(course.course_data.logistics.startDate, language)}
                </p>
              </div>
            </div>
          )}

          {/* Duration & Total Time */}
          {course.course_data?.logistics?.duration && (
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('course.duration')}</p>
                <p className="text-sm text-gray-700">
                  {(() => {
                    const logistics = course.course_data.logistics;
                    const duration = formatDuration(logistics.duration, t);
                    const calculatedHours = calculateTotalHours(
                      logistics.schedule.days_of_week,
                      logistics.duration,
                      logistics.session_duration_hours
                    );
                    const hours = calculatedHours ? `${calculatedHours}h` : null;

                    const parts = [];
                    if (duration) parts.push(duration);
                    if (hours) parts.push(hours);
                    return parts.join(' • ');
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Modality (Mode - Virtual/Onsite) */}
          {(course.course_data?.logistics?.modality || course.course_data?.mode) && (
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('course.mode')}</p>
                <p className="text-sm text-gray-700">
                  {(() => {
                    const modeValue =
                      course.course_data?.logistics?.modality || course.course_data?.mode;
                    if (!modeValue) return '';
                    const mode = modeValue.toLowerCase();
                    if (mode === 'online' || mode === 'virtual') {
                      return language === 'es' ? 'Virtual (Online)' : 'Virtual (Online)';
                    } else if (mode === 'presencial' || mode === 'onsite' || mode === 'on-site') {
                      return language === 'es'
                        ? 'Presencial (On-site)'
                        : 'On-site (In-person)';
                    } else if (mode === 'híbrido' || mode === 'hybrid') {
                      return language === 'es' ? 'Híbrido (Hybrid)' : 'Hybrid';
                    } else {
                      return modeValue;
                    }
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Schedule (Day and Time) */}
          {course.course_data?.logistics?.schedule && (
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('course.schedule')}</p>
                <p className="text-sm text-gray-700">
                  {formatSchedule(
                    course.course_data.logistics.schedule.days_of_week,
                    course.course_data.logistics.scheduleDetail,
                    language
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Forum Link */}
          <Link
            href={`/course/${slug}/forum`}
            className="flex items-start gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-[#10b981] mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#10b981]">{t('course.courseForum')}</p>
              <p className="text-xs text-gray-600">{t('course.forumDescription')}</p>
            </div>
            <svg
              className="w-4 h-4 text-gray-400 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Description */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-2">{t('course.aboutCourse')}</h3>
          {course.course_data?.long_description ? (
            <div className="prose prose-sm max-w-none text-gray-700">
              <MarkdownContent content={course.course_data.long_description} />
            </div>
          ) : course.short_description ? (
            <p className="text-sm text-gray-700">{course.short_description}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">{t('course.noDescription')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

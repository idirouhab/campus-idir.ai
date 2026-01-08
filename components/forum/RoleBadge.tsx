'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface RoleBadgeProps {
  isInstructor: boolean;
}

export default function RoleBadge({ isInstructor }: RoleBadgeProps) {
  const { t } = useLanguage();

  if (isInstructor) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        {t('forum.instructor')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {t('forum.student')}
    </span>
  );
}

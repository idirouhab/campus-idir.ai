'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Mail } from 'lucide-react';

interface ForumPrivatePanelProps {
  instructorEmail?: string;
}

export default function ForumPrivatePanel({ instructorEmail }: ForumPrivatePanelProps) {
  const { t } = useLanguage();

  if (!instructorEmail) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900">
            {t('forum.privateQuestions.title')}
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            {t('forum.privateQuestions.message')}
          </p>
          <a
            href={`mailto:${instructorEmail}`}
            className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {t('forum.privateQuestions.emailInstructor')}
          </a>
        </div>
      </div>
    </div>
  );
}

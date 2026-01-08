'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle } from 'lucide-react';

export default function ForumWarningBanner() {
  const { t } = useLanguage();

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-yellow-800">
            {t('forum.warningBanner.title')}
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {t('forum.warningBanner.message')}
          </p>
        </div>
      </div>
    </div>
  );
}

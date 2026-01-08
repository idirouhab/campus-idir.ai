'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, X } from 'lucide-react';
import { SensitiveDataMatch } from '@/lib/sensitive-data-detector';

interface SensitiveDataWarningModalProps {
  isOpen: boolean;
  detectedPatterns: SensitiveDataMatch[];
  onCancel: () => void;
  onProceed: () => void;
}

export default function SensitiveDataWarningModal({
  isOpen,
  detectedPatterns,
  onCancel,
  onProceed,
}: SensitiveDataWarningModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1001] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>

          {/* Content */}
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">
              {t('forum.sensitiveDataWarning.title')}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {t('forum.sensitiveDataWarning.message')}
            </p>

            {/* Detected patterns */}
            <div className="mt-4 text-left bg-yellow-50 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-800 mb-2">
                {t('forum.sensitiveDataWarning.detected')}
              </p>
              <ul className="text-xs text-yellow-700 space-y-1">
                {detectedPatterns.map((match, idx) => (
                  <li key={idx} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mr-2" />
                    {match.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('forum.sensitiveDataWarning.cancel')}
            </button>
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700"
            >
              {t('forum.sensitiveDataWarning.proceed')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

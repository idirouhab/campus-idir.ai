'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingOverlay({ message, fullScreen = true }: LoadingOverlayProps) {
  const { t } = useLanguage();

  const content = (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {/* Animated loader */}
      <div className="relative w-20 h-20">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
        {/* Spinning ring */}
        <div className="absolute inset-0 border-4 border-transparent border-t-[#10b981] rounded-full animate-spin"></div>
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-[#10b981] rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Loading text */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {message || t('common.loading')}
        </h3>
        <p className="text-sm text-gray-600">
          {t('navigation.pleaseWait')}
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50/95 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        {content}
      </div>
    </div>
  );
}

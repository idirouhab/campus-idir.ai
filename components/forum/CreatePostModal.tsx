'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';
import { detectSensitiveData } from '@/lib/sensitive-data-detector';
import SensitiveDataWarningModal from './SensitiveDataWarningModal';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, body: string) => Promise<void>;
}

export default function CreatePostModal({ isOpen, onClose, onSubmit }: CreatePostModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sensitive data detection
  const [showSensitiveWarning, setShowSensitiveWarning] = useState(false);
  const [detectedPatterns, setDetectedPatterns] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check for sensitive data
    const combinedText = `${title}\n${body}`;
    const patterns = detectSensitiveData(combinedText);

    if (patterns.length > 0) {
      setDetectedPatterns(patterns);
      setShowSensitiveWarning(true);
      return;
    }

    await submitPost();
  };

  const submitPost = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(title, body);
      setTitle('');
      setBody('');
      onClose();
    } catch (err: any) {
      setError(err.message || t('forum.createPostForm.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[1000] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('forum.createPostForm.title')}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('forum.createPostForm.titleLabel')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('forum.createPostForm.titlePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  maxLength={255}
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('forum.createPostForm.bodyLabel')}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('forum.createPostForm.bodyPlaceholder')}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('forum.markdownSupported') || 'Markdown supported: **bold**, *italic*, `code`, etc.'}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  {t('forum.createPostForm.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('forum.createPostForm.submitting') : t('forum.createPostForm.submitButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Sensitive Data Warning Modal */}
      <SensitiveDataWarningModal
        isOpen={showSensitiveWarning}
        detectedPatterns={detectedPatterns}
        onCancel={() => setShowSensitiveWarning(false)}
        onProceed={() => {
          setShowSensitiveWarning(false);
          submitPost();
        }}
      />
    </>
  );
}

'use client';

import { validatePassword } from '@/lib/passwordValidation';
import { useLanguage } from '@/contexts/LanguageContext';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useLanguage();

  if (!password) return null;

  const validation = validatePassword(password);

  const strengthColors = {
    weak: 'bg-[#ef4444]',
    medium: 'bg-[#f59e0b]',
    strong: 'bg-[#10b981]',
  };

  const strengthWidth = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full',
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${strengthColors[validation.strength]} ${strengthWidth[validation.strength]} transition-all duration-300`}
          />
        </div>
        <span className={`text-xs font-bold uppercase tracking-wide ${
          validation.strength === 'strong' ? 'text-[#10b981]' :
          validation.strength === 'medium' ? 'text-[#f59e0b]' :
          'text-[#ef4444]'
        }`}>
          {t(`password.${validation.strength}`)}
        </span>
      </div>

      {/* Requirements List */}
      {validation.errors.length > 0 && (
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-bold uppercase tracking-wide">{t('password.required')}</p>
          <ul className="space-y-0.5">
            {validation.errors.map((error, index) => (
              <li key={index} className="flex items-center gap-2">
                <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

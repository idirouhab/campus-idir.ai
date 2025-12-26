'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm font-bold rounded transition-all ${
          language === 'en'
            ? 'bg-[#10b981] text-black'
            : 'bg-transparent text-[#9ca3af] hover:text-white border border-[#1f2937]'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('es')}
        className={`px-3 py-1 text-sm font-bold rounded transition-all ${
          language === 'es'
            ? 'bg-[#10b981] text-black'
            : 'bg-transparent text-[#9ca3af] hover:text-white border border-[#1f2937]'
        }`}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  );
}

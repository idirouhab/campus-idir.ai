'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CourseChecklist, StudentChecklist, ChecklistItem, ChecklistItemProgress } from '@/types/database';

interface ChecklistProps {
  checklist: CourseChecklist;
  progress: StudentChecklist;
  onUpdateItem: (itemId: string, completed: boolean, notes?: string) => Promise<any>;
}

export default function Checklist({ checklist, progress, onUpdateItem }: ChecklistProps) {
  const { t } = useLanguage();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const getItemProgress = (itemId: string): ChecklistItemProgress | undefined => {
    return progress.items_progress.find((p) => p.item_id === itemId);
  };

  const handleToggleItem = async (itemId: string, currentCompleted: boolean) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      await onUpdateItem(itemId, !currentCompleted);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const completedCount = progress.items_progress.filter(p => p.completed).length;
  const totalCount = checklist.items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Sort items by order
  const sortedItems = [...checklist.items].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-4 md:p-6 animate-fade-in shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            {checklist.title}
          </h2>
          <span className="text-sm font-bold text-gray-600">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#10b981] transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {sortedItems.map((item: ChecklistItem) => {
          const itemProgress = getItemProgress(item.id);
          const isCompleted = itemProgress?.completed || false;
          const isUpdating = updatingItems.has(item.id);

          return (
            <div
              key={item.id}
              className={`group p-3 rounded border transition-all ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleItem(item.id, isCompleted)}
                  disabled={isUpdating}
                  className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 transition-all ${
                    isCompleted
                      ? 'bg-[#10b981] border-[#10b981]'
                      : 'border-gray-300 hover:border-[#10b981]'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={isCompleted ? t('checklist.markIncomplete') : t('checklist.markComplete')}
                >
                  {isCompleted && (
                    <svg
                      className="w-full h-full text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                {/* Item Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${
                    isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {item.title}
                  </h3>
                  {item.description && !isCompleted && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { CourseChecklist, StudentChecklist } from '@/types/database';
import {
  getCourseChecklistAction,
  getStudentChecklistAction,
  createStudentChecklistAction,
  updateChecklistItemAction
} from '@/lib/checklist-actions';

export function useCourseChecklist(courseId: string | undefined, courseSignupId: string | undefined) {
  const [checklist, setChecklist] = useState<CourseChecklist | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !courseSignupId) {
      setChecklist(null);
      setStudentProgress(null);
      setLoading(false);
      return;
    }

    async function fetchChecklist() {
      try {
        setLoading(true);

        // Fetch course checklist
        const checklistResult = await getCourseChecklistAction(courseId);
        if (!checklistResult.success) {
          setError(checklistResult.error || 'Failed to fetch checklist');
          return;
        }

        // If no checklist exists for this course, we're done
        if (!checklistResult.data) {
          setChecklist(null);
          setStudentProgress(null);
          return;
        }

        setChecklist(checklistResult.data);

        // Fetch student progress
        const progressResult = await getStudentChecklistAction(courseSignupId, checklistResult.data.id);
        if (!progressResult.success) {
          setError(progressResult.error || 'Failed to fetch progress');
          return;
        }

        // If no progress exists, create it
        if (!progressResult.data) {
          const createResult = await createStudentChecklistAction(courseSignupId, checklistResult.data.id);
          if (createResult.success && createResult.data) {
            setStudentProgress(createResult.data);
          }
        } else {
          setStudentProgress(progressResult.data);
        }
      } catch (err: any) {
        console.error('[useCourseChecklist] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchChecklist();
  }, [courseId, courseSignupId]);

  const updateItem = async (itemId: string, completed: boolean, notes?: string) => {
    if (!studentProgress) return { success: false, error: 'No progress data' };

    const result = await updateChecklistItemAction(studentProgress.id, itemId, completed, notes);
    if (result.success && result.data) {
      setStudentProgress(result.data);
    }
    return result;
  };

  return { checklist, studentProgress, loading, error, updateItem };
}

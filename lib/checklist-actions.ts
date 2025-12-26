'use server';

import { getDb } from '@/lib/db';
import { CourseChecklist, StudentChecklist, ChecklistItemProgress } from '@/types/database';

export async function getCourseChecklistAction(courseId: string) {
  try {
    const sql = getDb();

    const result = await sql`
      SELECT *
      FROM course_checklists
      WHERE course_id = ${courseId}
      LIMIT 1
    `;

    // No checklist found is not an error, just return null
    if (result.length === 0) {
      return { success: true, data: null };
    }

    const row = result[0];
    const checklist: CourseChecklist = {
      id: row.id,
      course_id: row.course_id,
      title: row.title,
      description: row.description,
      items: row.items,
      is_required: row.is_required,
      display_order: row.display_order,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return { success: true, data: checklist };
  } catch (err: any) {
    console.error('[getCourseChecklistAction] Exception:', err);
    return { success: false, error: err.message };
  }
}

export async function getStudentChecklistAction(courseSignupId: string, checklistId: string) {
  try {
    const sql = getDb();

    const result = await sql`
      SELECT *
      FROM student_checklists
      WHERE course_signup_id = ${courseSignupId}
        AND course_checklist_id = ${checklistId}
      LIMIT 1
    `;

    // No progress found is not an error, just return null
    if (result.length === 0) {
      return { success: true, data: null };
    }

    const row = result[0];
    const studentChecklist: StudentChecklist = {
      id: row.id,
      course_signup_id: row.course_signup_id,
      course_checklist_id: row.course_checklist_id,
      status: row.status,
      items_progress: row.items_progress,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return { success: true, data: studentChecklist };
  } catch (err: any) {
    console.error('[getStudentChecklistAction] Exception:', err);
    return { success: false, error: err.message };
  }
}

export async function createStudentChecklistAction(courseSignupId: string, checklistId: string) {
  try {
    const sql = getDb();

    // First, get the checklist items
    const checklistResult = await sql`
      SELECT items
      FROM course_checklists
      WHERE id = ${checklistId}
      LIMIT 1
    `;

    if (checklistResult.length === 0) {
      return { success: false, error: 'Checklist not found' };
    }

    // Initialize empty progress for all items
    const items_progress: ChecklistItemProgress[] = checklistResult[0].items?.map((item: any) => ({
      item_id: item.id,
      completed: false,
      completed_at: null,
      notes: ''
    })) || [];

    // Insert the student checklist
    const result = await sql`
      INSERT INTO student_checklists (
        course_signup_id,
        course_checklist_id,
        status,
        items_progress
      )
      VALUES (
        ${courseSignupId},
        ${checklistId},
        'pending',
        ${sql.json(items_progress as any)}
      )
      RETURNING *
    `;

    if (result.length === 0) {
      return { success: false, error: 'Failed to create student checklist' };
    }

    const row = result[0];
    const studentChecklist: StudentChecklist = {
      id: row.id,
      course_signup_id: row.course_signup_id,
      course_checklist_id: row.course_checklist_id,
      status: row.status,
      items_progress: row.items_progress,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return { success: true, data: studentChecklist };
  } catch (err: any) {
    console.error('[createStudentChecklistAction] Exception:', err);
    return { success: false, error: err.message };
  }
}

export async function updateChecklistItemAction(
  studentChecklistId: string,
  itemId: string,
  completed: boolean,
  notes?: string
) {
  try {
    const sql = getDb();

    // First get current progress
    const currentResult = await sql`
      SELECT items_progress
      FROM student_checklists
      WHERE id = ${studentChecklistId}
      LIMIT 1
    `;

    if (currentResult.length === 0) {
      console.error('[updateChecklistItemAction] Student checklist not found');
      return { success: false, error: 'Student checklist not found' };
    }

    // Update the specific item
    const updatedProgress = (currentResult[0].items_progress as ChecklistItemProgress[]).map((item) => {
      if (item.item_id === itemId) {
        return {
          ...item,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          notes: notes || item.notes
        };
      }
      return item;
    });

    // Update in database
    const result = await sql`
      UPDATE student_checklists
      SET items_progress = ${sql.json(updatedProgress as any)},
          updated_at = NOW()
      WHERE id = ${studentChecklistId}
      RETURNING *
    `;

    if (result.length === 0) {
      return { success: false, error: 'Failed to update checklist item' };
    }

    const row = result[0];
    const studentChecklist: StudentChecklist = {
      id: row.id,
      course_signup_id: row.course_signup_id,
      course_checklist_id: row.course_checklist_id,
      status: row.status,
      items_progress: row.items_progress,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return { success: true, data: studentChecklist };
  } catch (err: any) {
    console.error('[updateChecklistItemAction] Exception:', err);
    return { success: false, error: err.message };
  }
}

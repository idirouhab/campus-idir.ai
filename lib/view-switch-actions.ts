'use server';

import { getSession } from './session';
import { generateAccessToken } from './jwt';
import { setAuthCookie } from './cookies';

interface ViewSwitchResponse {
  success: boolean;
  error?: string;
}

/**
 * Switch between student and instructor views for dual-role users
 */
export async function switchViewAction(
  view: 'student' | 'instructor'
): Promise<ViewSwitchResponse> {
  try {
    // Get current session
    const session = await getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate user has access to the requested view
    if (view === 'student' && !session.hasStudentProfile) {
      return { success: false, error: 'You do not have a student profile' };
    }

    if (view === 'instructor' && !session.hasInstructorProfile) {
      return { success: false, error: 'You do not have an instructor profile' };
    }

    // Determine new userType based on view
    const newUserType = view === 'instructor' ? 'instructor' : 'student';

    // Generate new JWT with updated currentView and userType
    const token = await generateAccessToken(
      session.id,
      newUserType,
      session.email,
      session.roles,
      session.hasStudentProfile,
      session.hasInstructorProfile,
      view
    );

    // Update auth_token cookie
    await setAuthCookie(token);

    return { success: true };
  } catch (error: any) {
    console.error('[VIEW_SWITCH] Error switching view:', error);
    return { success: false, error: 'Failed to switch view' };
  }
}

/**
 * Shared query functions for forum
 * These functions are used with React Query for caching and data fetching
 */

export interface ForumPost {
  id: string;
  course_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_resolved: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_is_instructor: boolean;
  answer_count: number;
  has_verified_answer: boolean;
}

export interface ForumAnswer {
  id: string;
  post_id: string;
  course_id: string;
  user_id: string;
  body: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  author_first_name: string;
  author_last_name: string;
  author_is_instructor: boolean;
}

// Fetch forum posts for a course
export async function fetchForumPosts(courseId: string): Promise<ForumPost[]> {
  const response = await fetch(`/api/courses/${courseId}/forum/posts`);
  if (!response.ok) {
    throw new Error('Failed to fetch forum posts');
  }
  const data = await response.json();
  return data.posts || [];
}

// Fetch forum answers for a post
export async function fetchForumAnswers(
  courseId: string,
  postId: string
): Promise<ForumAnswer[]> {
  const response = await fetch(
    `/api/courses/${courseId}/forum/posts/${postId}/answers`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch forum answers');
  }
  const data = await response.json();
  return data.answers || [];
}

// Create a new forum post
export async function createForumPost(
  courseId: string,
  title: string,
  body: string,
  csrfToken: string
): Promise<ForumPost> {
  const response = await fetch(`/api/courses/${courseId}/forum/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ title, body }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create post');
  }

  const data = await response.json();
  return data.post;
}

// Create a new forum answer
export async function createForumAnswer(
  courseId: string,
  postId: string,
  body: string,
  csrfToken: string
): Promise<ForumAnswer> {
  const response = await fetch(
    `/api/courses/${courseId}/forum/posts/${postId}/answers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create answer');
  }

  const data = await response.json();
  return data.answer;
}

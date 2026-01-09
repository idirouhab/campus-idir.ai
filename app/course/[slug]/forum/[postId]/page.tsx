'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import ForumWarningBanner from '@/components/forum/ForumWarningBanner';
import RoleBadge from '@/components/forum/RoleBadge';
import { detectSensitiveData } from '@/lib/sensitive-data-detector';
import SensitiveDataWarningModal from '@/components/forum/SensitiveDataWarningModal';
import { CheckCircle, ArrowLeft, Trash2 } from 'lucide-react';
import Cookies from 'js-cookie';
import MarkdownContent from '@/components/MarkdownContent';

interface ForumPost {
    id: string;
    title: string;
    body: string;
    user_id: string;
    created_at: string;
    updated_at?: string;
    author_first_name: string;
    author_last_name: string;
    author_is_instructor: boolean;
    is_resolved: boolean;
}

interface ForumAnswer {
    id: string;
    body: string;
    user_id: string;
    is_verified: boolean;
    created_at: string;
    updated_at?: string;
    author_first_name: string;
    author_last_name: string;
    author_is_instructor: boolean;
}

export default function PostDetailPage() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string;
    const postId = params?.postId as string;

    const [courseId, setCourseId] = useState<string | null>(null);
    const [post, setPost] = useState<ForumPost | null>(null);
    const [answers, setAnswers] = useState<ForumAnswer[]>([]);
    const [loading, setLoading] = useState(true);
    const [answerBody, setAnswerBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sensitive data detection
    const [showSensitiveWarning, setShowSensitiveWarning] = useState(false);
    const [detectedPatterns, setDetectedPatterns] = useState<any[]>([]);
    const [isInstructorMode, setIsInstructorMode] = useState(false);

    // Edit mode state for post
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editBody, setEditBody] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Edit mode state for answers
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [editAnswerBody, setEditAnswerBody] = useState('');
    const [isUpdatingAnswer, setIsUpdatingAnswer] = useState(false);

    // Delete confirmation state
    const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
    const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize: Check user type and fetch course ID in parallel
    useEffect(() => {
        async function initialize() {
            try {
                // Run both requests in parallel
                const [sessionResponse, courseResponse] = await Promise.all([
                    fetch('/api/auth/session', { credentials: 'include' }),
                    fetch(`/api/courses/by-slug/${slug}`)
                ]);

                const [sessionData, courseData] = await Promise.all([
                    sessionResponse.json(),
                    courseResponse.json()
                ]);

                setIsInstructorMode(sessionData.user?.userType === 'instructor');
                setCurrentUserId(sessionData.user?.id || null);

                if (courseData.success && courseData.course) {
                    setCourseId(courseData.course.id);
                }
            } catch (error) {
                console.error('Error initializing:', error);
            }
        }
        initialize();
    }, [slug]);

    // Fetch post and answers in parallel
    useEffect(() => {
        async function fetchData() {
            if (!courseId) return;

            setLoading(true);
            try {
                // Fetch post and answers in parallel
                const [postResponse, answersResponse] = await Promise.all([
                    fetch(`/api/courses/${courseId}/forum/posts/${postId}`),
                    fetch(`/api/courses/${courseId}/forum/posts/${postId}/answers`)
                ]);

                const [postData, answersData] = await Promise.all([
                    postResponse.json(),
                    answersResponse.json()
                ]);

                if (postData.success) {
                    setPost(postData.post);
                }

                if (answersData.success) {
                    setAnswers(answersData.answers);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [courseId, postId]);

    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check for sensitive data
        const patterns = detectSensitiveData(answerBody);
        if (patterns.length > 0) {
            setDetectedPatterns(patterns);
            setShowSensitiveWarning(true);
            return;
        }

        await submitAnswer();
    };

    const submitAnswer = async () => {
        setIsSubmitting(true);
        const csrfToken = Cookies.get('csrf_token');

        try {
            const response = await fetch(`/api/courses/${courseId}/forum/posts/${postId}/answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken || '',
                },
                body: JSON.stringify({ body: answerBody }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit answer');
            }

            const data = await response.json();
            if (data.success) {
                setAnswers([...answers, data.answer]);
                setAnswerBody('');
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditPost = () => {
        if (post) {
            setEditTitle(post.title);
            setEditBody(post.body);
            setIsEditingPost(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingPost(false);
        setEditTitle('');
        setEditBody('');
    };

    const handleUpdatePost = async () => {
        if (!courseId || !post) return;

        setIsUpdating(true);
        const csrfToken = Cookies.get('csrf_token');

        try {
            const response = await fetch(`/api/courses/${courseId}/forum/posts/${postId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken || '',
                },
                body: JSON.stringify({
                    title: editTitle,
                    body: editBody,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update post');
            }

            const data = await response.json();
            if (data.success) {
                setPost({ ...post, title: editTitle, body: editBody });
                setIsEditingPost(false);
            }
        } catch (error) {
            console.error('Error updating post:', error);
            alert(t('common.updateError') || 'Failed to update post');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeletePost = async () => {
        if (!courseId) return;

        setIsDeleting(true);
        const csrfToken = Cookies.get('csrf_token');

        try {
            const response = await fetch(`/api/courses/${courseId}/forum/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken || '',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete post');
            }

            const data = await response.json();
            if (data.success) {
                // Redirect to forum page after successful deletion
                router.push(`/course/${slug}/forum`);
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert(t('common.deleteError') || 'Failed to delete post');
        } finally {
            setIsDeleting(false);
            setShowDeletePostConfirm(false);
        }
    };

    const handleEditAnswer = (answer: ForumAnswer) => {
        setEditingAnswerId(answer.id);
        setEditAnswerBody(answer.body);
    };

    const handleCancelEditAnswer = () => {
        setEditingAnswerId(null);
        setEditAnswerBody('');
    };

    const handleUpdateAnswer = async (answerId: string) => {
        if (!courseId) return;

        setIsUpdatingAnswer(true);
        const csrfToken = Cookies.get('csrf_token');

        try {
            const response = await fetch(`/api/courses/${courseId}/forum/posts/${postId}/answers/${answerId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken || '',
                },
                body: JSON.stringify({
                    body: editAnswerBody,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update answer');
            }

            const data = await response.json();
            if (data.success) {
                // Update the answer in the list
                setAnswers(answers.map(a =>
                    a.id === answerId ? { ...a, body: editAnswerBody } : a
                ));
                setEditingAnswerId(null);
                setEditAnswerBody('');
            }
        } catch (error) {
            console.error('Error updating answer:', error);
            alert(t('common.updateError') || 'Failed to update answer');
        } finally {
            setIsUpdatingAnswer(false);
        }
    };

    const handleDeleteAnswer = async (answerId: string) => {
        if (!courseId) return;

        setIsDeleting(true);
        const csrfToken = Cookies.get('csrf_token');

        try {
            const response = await fetch(`/api/courses/${courseId}/forum/posts/${postId}/answers/${answerId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken || '',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete answer');
            }

            const data = await response.json();
            if (data.success) {
                // Remove the answer from the list
                setAnswers(answers.filter(a => a.id !== answerId));
            }
        } catch (error) {
            console.error('Error deleting answer:', error);
            alert(t('common.deleteError') || 'Failed to delete answer');
        } finally {
            setIsDeleting(false);
            setDeletingAnswerId(null);
        }
    };

    if (loading || !post) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600">{t('common.loading')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
                {/* Back Link */}
                <Link
                    href={`/course/${slug}/forum`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t('forum.postDetail.backToForum')}
                </Link>

                {/* Warning Banner */}
                <ForumWarningBanner />

                {/* Post */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    {!isEditingPost ? (
                        <>
                            {/* Post Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                                        {post.title}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      {post.author_first_name} {post.author_last_name}
                    </span>
                                        <RoleBadge isInstructor={post.author_is_instructor} />
                                        <span>•</span>
                                        <span>
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {post.is_resolved && (
                                        <div className="flex items-center gap-1 text-green-600 font-medium">
                                            <CheckCircle className="h-5 w-5" />
                                            {t('forum.resolved')}
                                        </div>
                                    )}
                                    {/* Edit and Delete Buttons - Only show to author */}
                                    {currentUserId && post.user_id === currentUserId && (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <button
                                                onClick={handleEditPost}
                                                className="flex items-center justify-center gap-1 px-4 py-2.5 min-h-[44px] text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                <span className="hidden sm:inline">{t('forum.editPost') || 'Edit'}</span>
                                            </button>
                                            <button
                                                onClick={() => setShowDeletePostConfirm(true)}
                                                className="flex items-center justify-center gap-1 px-4 py-2.5 min-h-[44px] text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span className="hidden sm:inline">{t('common.deletePost') || 'Delete'}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Post Body */}
                            <div className="text-gray-700">
                                <MarkdownContent content={post.body} />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Edit Form */}
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                {t('forum.editingPost') || 'Editing Post'}
                            </h2>
                            <div className="space-y-4">
                                {/* Title Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('forum.createPostForm.titleLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                        maxLength={255}
                                    />
                                </div>

                                {/* Body Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('forum.createPostForm.bodyLabel')}
                                    </label>
                                    <textarea
                                        value={editBody}
                                        onChange={(e) => setEditBody(e.target.value)}
                                        rows={10}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {t('forum.markdownSupported')}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                        disabled={isUpdating}
                                    >
                                        {t('common.cancel') || 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleUpdatePost}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? (t('forum.updating') || 'Updating...') : (t('forum.saveChanges') || 'Save Changes')}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Answers Section */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {t('forum.postDetail.answers')} ({answers.length})
                    </h2>

                    {answers.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">
                            {t('forum.postDetail.noAnswersMessage')}
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {answers.map((answer) => (
                                <div
                                    key={answer.id}
                                    className={`border-l-4 pl-4 py-3 ${
                                        answer.is_verified
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200'
                                    }`}
                                >
                                    {editingAnswerId !== answer.id ? (
                                        <>
                                            {/* Answer Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 font-medium">
                            {answer.author_first_name} {answer.author_last_name}
                          </span>
                                                    <RoleBadge isInstructor={answer.author_is_instructor} />
                                                    {answer.is_verified && (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle className="h-3 w-3" />
                                                            {t('forum.verified')}
                            </span>
                                                    )}
                                                    <span className="text-xs text-gray-500">
                            {new Date(answer.created_at).toLocaleDateString()}
                          </span>
                                                </div>
                                                {/* Edit and Delete Buttons - Only show to author */}
                                                {currentUserId && answer.user_id === currentUserId && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleEditAnswer(answer)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            {t('forum.editPost') || 'Edit'}
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingAnswerId(answer.id)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            {t('common.deletePost') || 'Delete'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Answer Body */}
                                            <div className="text-gray-700">
                                                <MarkdownContent content={answer.body} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Edit Form */}
                                            <div className="space-y-3">
                        <textarea
                            value={editAnswerBody}
                            onChange={(e) => setEditAnswerBody(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                            required
                        />
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {t('forum.markdownSupported')}
                                                </p>
                                                <div className="flex flex-col sm:flex-row justify-end gap-2">
                                                    <button
                                                        onClick={handleCancelEditAnswer}
                                                        className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                                        disabled={isUpdatingAnswer}
                                                    >
                                                        {t('common.cancel') || 'Cancel'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateAnswer(answer.id)}
                                                        className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        disabled={isUpdatingAnswer}
                                                    >
                                                        {isUpdatingAnswer ? (t('forum.updating') || 'Updating...') : (t('forum.saveChanges') || 'Save')}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Answer Form */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('forum.createAnswerForm.title')}
                    </h2>
                    <form onSubmit={handleSubmitAnswer}>
                        <div className="mb-2">
              <textarea
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  placeholder={t('forum.createAnswerForm.bodyPlaceholder')}
                  rows={6}
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
                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t('forum.createAnswerForm.submitting') : t('forum.createAnswerForm.submitButton')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sensitive Data Warning Modal */}
            <SensitiveDataWarningModal
                isOpen={showSensitiveWarning}
                detectedPatterns={detectedPatterns}
                onCancel={() => setShowSensitiveWarning(false)}
                onProceed={() => {
                    setShowSensitiveWarning(false);
                    submitAnswer();
                }}
            />

            {/* Delete Post Confirmation Modal */}
            {showDeletePostConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {t('common.deletePostConfirm.title') || 'Delete Post?'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {t('common.deletePostConfirm.message') || 'Are you sure you want to delete this post? This action cannot be undone and will also delete all answers.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeletePostConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={isDeleting}
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={handleDeletePost}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (t('common.deleting') || 'Deleting...') : (t('common.deletePost') || 'Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Answer Confirmation Modal */}
            {deletingAnswerId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {t('common.deleteAnswerConfirm.title') || 'Delete Answer?'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {t('common.deleteAnswerConfirm.message') || 'Are you sure you want to delete this answer? This action cannot be undone.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingAnswerId(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={isDeleting}
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={() => handleDeleteAnswer(deletingAnswerId)}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (t('common.deleting') || 'Deleting...') : (t('common.deleteAnswer') || 'Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import ForumWarningBanner from '@/components/forum/ForumWarningBanner';
import ForumPrivatePanel from '@/components/forum/ForumPrivatePanel';
import CreatePostModal from '@/components/forum/CreatePostModal';
import RoleBadge from '@/components/forum/RoleBadge';
import { MessageSquare, Eye, CheckCircle, Plus } from 'lucide-react';
// Cookies import was unused in the snippets, removed unless needed elsewhere
import LoadingOverlay from '@/components/LoadingOverlay';
import { fetchForumPosts, createForumPost, ForumPost as ForumPostType } from '@/lib/queries/forum-queries';

type ForumPost = ForumPostType;

export default function ForumPage() {
    const { t } = useLanguage();
    const { user, csrfToken } = useAuth();
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string;
    const queryClient = useQueryClient();

    const [instructorEmail, setInstructorEmail] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isInstructorMode, setIsInstructorMode] = useState(false);

    // 1. Fetch course
    const { data: courseData } = useQuery({
        queryKey: ['course', slug],
        queryFn: async () => {
            const response = await fetch(`/api/courses/by-slug/${slug}`);
            const data = await response.json();
            return data.success && data.course ? data.course : null;
        },
    });
    const courseId = courseData?.id;

    // 2. Check User Type
    useEffect(() => {
        async function checkUserType() {
            try {
                const response = await fetch('/api/auth/session', { credentials: 'include' });
                const data = await response.json();
                setIsInstructorMode(data.user?.userType === 'instructor');
            } catch (error) {
                console.error('Error checking user type:', error);
            }
        }
        checkUserType();
    }, []);

    // 3. Check Access
    const { data: accessData } = useQuery({
        queryKey: ['forum-access', courseId],
        queryFn: async () => {
            if (!courseId) return { hasAccess: false };
            const response = await fetch(`/api/courses/${courseId}/forum/check-access`);
            const data = await response.json();
            return { hasAccess: data.hasAccess === true };
        },
        enabled: !!courseId,
    });
    const hasAccess = accessData?.hasAccess || false;

    // 4. Fetch Posts (FIXED)
    const { data: posts = [], isLoading: loading } = useQuery({
        queryKey: ['forum-posts', courseId],
        queryFn: () => fetchForumPosts(courseId!),
        enabled: !!courseId && hasAccess,
        staleTime: 2 * 60 * 1000,
    });

    // 5. Create Mutation
    const createPostMutation = useMutation({
        mutationFn: ({ title, body }: { title: string; body: string }) =>
            createForumPost(courseId!, title, body, csrfToken || ''),
        onSuccess: (newPost) => {
            queryClient.setQueryData(['forum-posts', courseId], (oldPosts: ForumPost[] = []) => [
                newPost,
                ...oldPosts,
            ]);
            setShowCreateModal(false);
        },
    });

    const handleCreatePost = async (title: string, body: string) => {
        await createPostMutation.mutateAsync({ title, body });
    };

    // --- RENDER LOGIC ---

    if (!courseData || accessData === undefined) {
        return <LoadingOverlay fullScreen={false} />;
    }

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            {t('forum.accessDenied.title')}
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {t('forum.accessDenied.message')}
                        </p>
                        <Link
                            href={isInstructorMode && courseId ? `/instructor/dashboard/courses/${courseId}/edit` : `/course/${slug}`}
                            className="inline-flex items-center justify-center px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                            {isInstructorMode ? t('forum.backToCourseManagement') : t('forum.accessDenied.backToCourse')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
                <div className="mb-8">
                    <Link
                        href={isInstructorMode && courseId ? `/instructor/dashboard/courses/${courseId}/edit` : `/course/${slug}`}
                        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
                    >
                        ← {isInstructorMode ? t('forum.backToCourseManagement') : t('forum.backToCourse')}
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {t('forum.title')}
                            </h1>
                            <p className="mt-2 text-gray-600">
                                {t('forum.subtitle')}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">{t('forum.createPost')}</span>
                            <span className="sm:hidden">{t('forum.ask')}</span>
                        </button>
                    </div>
                </div>

                <ForumWarningBanner />
                <ForumPrivatePanel instructorEmail={instructorEmail} />

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">{t('common.loading')}</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {t('forum.noPosts')}
                        </h3>
                        <p className="text-gray-600">
                            {t('forum.noPostsMessage')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/course/${slug}/forum/${post.id}`}
                                className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {post.is_pinned && (
                                                <span className="text-xs font-medium text-yellow-600">
                          {t('forum.pinned')}
                        </span>
                                            )}
                                            {post.is_resolved && (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            )}
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {post.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <span>
                        {post.author_first_name} {post.author_last_name}
                      </span>
                                            <RoleBadge isInstructor={post.author_is_instructor} />
                                            <span>•</span>
                                            <span>
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                          {post.answer_count} {post.answer_count === 1 ? t('forum.answerCount') : t('forum.answerCount_plural')}
                      </span>
                                            <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                                                {post.view_count} {post.view_count === 1 ? t('forum.viewCount') : t('forum.viewCount_plural')}
                      </span>
                                            {post.has_verified_answer && (
                                                <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle className="h-4 w-4" />
                                                    {t('forum.verified')}
                        </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <CreatePostModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePost}
            />
        </div>
    );
}
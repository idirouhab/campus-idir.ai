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
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Cookies from 'js-cookie';

interface ForumPost {
  id: string;
  title: string;
  body: string;
  user_id: string;
  created_at: string;
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

  // Check if user is in instructor mode
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

  // Fetch course ID
  useEffect(() => {
    async function fetchCourseId() {
      try {
        const response = await fetch(`/api/courses/by-slug/${slug}`);
        const data = await response.json();
        if (data.success && data.course) {
          setCourseId(data.course.id);
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      }
    }
    fetchCourseId();
  }, [slug]);

  // Fetch post and answers
  useEffect(() => {
    async function fetchData() {
      if (!courseId) return;

      setLoading(true);
      try {
        // Fetch post
        const postResponse = await fetch(`/api/courses/${courseId}/forum/posts/${postId}`);
        const postData = await postResponse.json();
        if (postData.success) {
          setPost(postData.post);
        }

        // Fetch answers
        const answersResponse = await fetch(`/api/courses/${courseId}/forum/posts/${postId}/answers`);
        const answersData = await answersResponse.json();
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

  if (loading || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
          <p className="text-center text-gray-600">{t('common.loading')}</p>
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
            {post.is_resolved && (
              <div className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle className="h-5 w-5" />
                {t('forum.resolved')}
              </div>
            )}
          </div>

          {/* Post Body */}
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
            {post.body}
          </div>
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
                  {/* Answer Header */}
                  <div className="flex items-center gap-2 mb-2">
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

                  {/* Answer Body */}
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {answer.body}
                  </div>
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
            <textarea
              value={answerBody}
              onChange={(e) => setAnswerBody(e.target.value)}
              placeholder={t('forum.createAnswerForm.bodyPlaceholder')}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
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
    </div>
  );
}

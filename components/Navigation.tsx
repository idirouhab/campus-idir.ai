'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import Cookies from 'js-cookie';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { Instructor } from '@/types/database';
import { canAssignInstructors } from '@/lib/roles';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [instructorData, setInstructorData] = useState<Instructor | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  // Don't render on instructor dashboard pages (they have their own navigation)
  if (pathname?.startsWith('/instructor/dashboard')) {
    return null;
  }

  // Check for instructor authentication and fetch full data
  useEffect(() => {
    const checkInstructorAuth = async () => {
      const instructorId = Cookies.get('instructorId');
      const userType = Cookies.get('userType');

      if (instructorId && userType === 'instructor') {
        setIsInstructor(true);

        // Fetch full instructor data for permission checks
        try {
          const result = await verifyInstructorAction(instructorId);
          if (result.success && result.data) {
            setInstructorData(result.data);
          } else {
            setInstructorData(null);
          }
        } catch (error) {
          console.error('Error fetching instructor data:', error);
          setInstructorData(null);
        }
      } else {
        setIsInstructor(false);
        setInstructorData(null);
      }
    };

    checkInstructorAuth();
    // Check periodically in case cookies change
    const interval = setInterval(checkInstructorAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInstructorSignOut = () => {
    Cookies.remove('instructorId');
    Cookies.remove('userType');
    setIsInstructor(false);
    router.push('/instructor/login');
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setScrolled(window.scrollY > 20);
      }, 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const showBackground = isMobile || scrolled;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
          showBackground
            ? 'backdrop-blur-xl border-b border-gray-200'
            : 'bg-transparent'
        }`}
        style={{
          background: showBackground ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Mobile menu button - Left side */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-900 hover:text-[#10b981] transition-colors"
                aria-label={isOpen ? t('navigation.closeMenu') : t('navigation.openMenu')}
              >
                <svg
                  className="h-6 w-6"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  {isOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>

            {/* Logo - Center on mobile, left on desktop */}
            <div className="flex-shrink-0 md:mr-auto">
              <Link
                href={isInstructor ? '/instructor/dashboard' : user ? '/dashboard' : '/'}
                className="text-xl md:text-2xl font-black text-gray-900 hover:text-[#10b981] transition-colors uppercase tracking-tight"
                aria-label="Home - Courses Platform"
              >
                IO
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2" role="menubar">
              <LanguageSwitcher />
              <div className="flex items-center space-x-1">
                {isInstructor ? (
                  <>
                    <Link
                      href="/instructor/dashboard"
                      className={`px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide rounded ${
                        pathname === '/instructor/dashboard'
                          ? 'text-[#10b981] bg-emerald-50'
                          : 'text-gray-700 hover:text-[#10b981] hover:bg-emerald-50'
                      }`}
                      role="menuitem"
                    >
                      {t('navigation.dashboard')}
                    </Link>
                    <Link
                      href="/instructor/dashboard/profile"
                      className={`px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide rounded ${
                        pathname === '/instructor/dashboard/profile'
                          ? 'text-[#10b981] bg-emerald-50'
                          : 'text-gray-700 hover:text-[#10b981] hover:bg-emerald-50'
                      }`}
                      role="menuitem"
                    >
                      {t('profile.title')}
                    </Link>
                    {instructorData && canAssignInstructors(instructorData) && (
                      <Link
                        href="/instructor/dashboard/manage-instructors"
                        className={`px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide rounded ${
                          pathname === '/instructor/dashboard/manage-instructors'
                            ? 'text-[#10b981] bg-emerald-50'
                            : 'text-gray-700 hover:text-[#10b981] hover:bg-emerald-50'
                        }`}
                        role="menuitem"
                      >
                        Manage Instructors
                      </Link>
                    )}
                    <button
                      onClick={handleInstructorSignOut}
                      className="px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide text-gray-700 hover:text-red-600 hover:bg-red-50 rounded"
                      role="menuitem"
                    >
                      {t('navigation.signOut')}
                    </button>
                  </>
                ) : user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className={`px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide rounded ${
                        pathname === '/dashboard'
                          ? 'text-[#10b981] bg-emerald-50'
                          : 'text-gray-700 hover:text-[#10b981] hover:bg-emerald-50'
                      }`}
                      role="menuitem"
                    >
                      {t('navigation.myCourses')}
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      className={`px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide rounded ${
                        pathname === '/dashboard/profile'
                          ? 'text-[#10b981] bg-emerald-50'
                          : 'text-gray-700 hover:text-[#10b981] hover:bg-emerald-50'
                      }`}
                      role="menuitem"
                    >
                      {t('profile.title')}
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide text-gray-700 hover:text-red-600 hover:bg-red-50 rounded"
                      role="menuitem"
                    >
                      {t('navigation.signOut')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={`px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide rounded ${
                        pathname === '/login'
                          ? 'text-[#10b981] bg-emerald-50'
                          : 'text-gray-700 hover:text-[#10b981] hover:bg-emerald-50'
                      }`}
                      role="menuitem"
                    >
                      {t('navigation.signIn')}
                    </Link>
                    <Link
                      href="/signup"
                      className="ml-2 px-4 py-2 text-sm font-bold transition-all uppercase tracking-wide bg-[#10b981] text-white rounded-lg hover:bg-[#059669]"
                      role="menuitem"
                    >
                      {t('navigation.signUp')}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Spacer for mobile to keep logo centered */}
            <div className="md:hidden w-10"></div>
          </div>
        </div>
      </nav>

      {/* Mobile menu backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998] md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile side menu - slides from left */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-[999] md:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-gray-50">
            <span className="text-xl font-black text-gray-900 uppercase tracking-tight">IO</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label={t('navigation.closeMenu')}
            >
              <svg
                className="h-5 w-5"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-3">
              {isInstructor ? (
                <>
                  <Link
                    href="/instructor/dashboard"
                    className={`block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg ${
                      pathname === '/instructor/dashboard'
                        ? 'text-[#10b981] bg-emerald-50 border-l-2 border-[#10b981]'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {t('navigation.dashboard')}
                  </Link>
                  <Link
                    href="/instructor/dashboard/profile"
                    className={`block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg ${
                      pathname === '/instructor/dashboard/profile'
                        ? 'text-[#10b981] bg-emerald-50 border-l-2 border-[#10b981]'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {t('profile.title')}
                  </Link>
                  {instructorData && canAssignInstructors(instructorData) && (
                    <Link
                      href="/instructor/dashboard/manage-instructors"
                      className={`block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg ${
                        pathname === '/instructor/dashboard/manage-instructors'
                          ? 'text-[#10b981] bg-emerald-50 border-l-2 border-[#10b981]'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      Manage Instructors
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleInstructorSignOut();
                      setIsOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50"
                  >
                    {t('navigation.signOut')}
                  </button>
                </>
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg ${
                      pathname === '/dashboard'
                        ? 'text-[#10b981] bg-emerald-50 border-l-2 border-[#10b981]'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {t('navigation.myCourses')}
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className={`block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg ${
                      pathname === '/dashboard/profile'
                        ? 'text-[#10b981] bg-emerald-50 border-l-2 border-[#10b981]'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {t('profile.title')}
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50"
                  >
                    {t('navigation.signOut')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg ${
                      pathname === '/login'
                        ? 'text-[#10b981] bg-emerald-50 border-l-2 border-[#10b981]'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {t('navigation.signIn')}
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg bg-[#10b981] text-white hover:bg-[#059669] mt-2"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('navigation.signUp')}
                  </Link>
                </>
              )}

              {/* Language Switcher */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 px-4">Language</p>
                <div className="px-4">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { canAssignInstructors } from '@/lib/roles';
import { Instructor } from '@/types/database';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [instructorData, setInstructorData] = useState<Instructor | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  // Only fetch instructor auth on instructor routes
  useEffect(() => {
    const isInstructorRoute = pathname?.startsWith('/instructor');

    if (!isInstructorRoute) {
      setInstructorData(null);
      return;
    }

    // Fetch instructor session
    const checkInstructorAuth = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.userType === 'instructor') {
            const instructorUser: Instructor = {
              id: data.user.id,
              email: data.user.email,
              first_name: data.user.firstName,
              last_name: data.user.lastName,
              role: data.user.role || 'instructor',
              is_active: true,
              email_verified: false,
              preferred_language: 'en',
              created_at: '',
              updated_at: '',
            };
            setInstructorData(instructorUser);
          } else {
            setInstructorData(null);
          }
        } else {
          setInstructorData(null);
        }
      } catch (err) {
        console.error('[Navigation] Error checking instructor auth:', err);
        setInstructorData(null);
      }
    };

    checkInstructorAuth();
  }, [pathname]);

  const isInstructor = instructorData !== null;

  const instructorSignOut = async () => {
    const { instructorSignOutAction } = await import('@/lib/instructor-auth-actions');
    await instructorSignOutAction();
    setInstructorData(null);
  };

  const handleInstructorSignOut = async () => {
    await instructorSignOut();
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

  const showBackground = true; // Always show background for consistency

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadge = (instructor: Instructor) => {
    if (instructor.role === 'admin') {
      return {
        text: 'Administrator',
        className: 'bg-purple-50 text-purple-700 border-purple-200'
      };
    }
    return {
      text: 'Instructor',
      className: 'bg-emerald-50 text-[#10b981] border-emerald-200'
    };
  };

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

            {/* Desktop Navigation - Profile Dropdown */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              {isInstructor && instructorData ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    {/* Profile Picture or Initials */}
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border-2 border-emerald-200">
                      {instructorData.picture_url ? (
                        <img
                          src={instructorData.picture_url}
                          alt={instructorData.first_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-[#10b981]">
                          {getInitials(instructorData.first_name, instructorData.last_name)}
                        </span>
                      )}
                    </div>

                    {/* Name and Role */}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-gray-900">
                        {instructorData.first_name} {instructorData.last_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getRoleBadge(instructorData).className}`}>
                        {getRoleBadge(instructorData).text}
                      </span>
                    </div>

                    {/* Dropdown Arrow */}
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDropdownOpen(false)}
                      />

                      {/* Menu */}
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        <Link
                          href="/instructor/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Dashboard
                        </Link>
                        {instructorData && canAssignInstructors(instructorData) && (
                          <Link
                            href="/instructor/dashboard/manage-instructors"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Manage Instructors
                          </Link>
                        )}
                        <Link
                          href="/instructor/dashboard/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Update My Profile
                        </Link>
                        <button
                          onClick={handleInstructorSignOut}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Log-out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    {/* Profile Picture or Initials */}
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border-2 border-emerald-200">
                      <span className="text-xs font-bold text-[#10b981]">
                        {getInitials(user.first_name || 'U', user.last_name || 'S')}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-gray-900">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                        Student
                      </span>
                    </div>

                    {/* Dropdown Arrow */}
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDropdownOpen(false)}
                      />

                      {/* Menu */}
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          My Courses
                        </Link>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </Link>
                        <button
                          onClick={() => signOut()}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Log-out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-2 text-sm font-bold transition-all uppercase tracking-wide text-gray-700 hover:text-[#10b981] hover:bg-emerald-50 rounded"
                  >
                    {t('navigation.signIn')}
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm font-bold transition-all uppercase tracking-wide bg-[#10b981] text-white rounded-lg hover:bg-[#059669]"
                  >
                    {t('navigation.signUp')}
                  </Link>
                </>
              )}
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
            {/* User Profile Section */}
            {(isInstructor && instructorData) && (
              <div className="px-3 pb-4 mb-4 border-b border-gray-200">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border-2 border-emerald-200">
                    {instructorData.picture_url ? (
                      <img
                        src={instructorData.picture_url}
                        alt={instructorData.first_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-[#10b981]">
                        {getInitials(instructorData.first_name, instructorData.last_name)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {instructorData.first_name} {instructorData.last_name}
                    </p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded border ${getRoleBadge(instructorData).className}`}>
                      {getRoleBadge(instructorData).text}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {user && !isInstructor && (
              <div className="px-3 pb-4 mb-4 border-b border-gray-200">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border-2 border-emerald-200">
                    <span className="text-sm font-bold text-[#10b981]">
                      {getInitials(user.first_name || 'U', user.last_name || 'S')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <span className="inline-block text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                      Student
                    </span>
                  </div>
                </div>
              </div>
            )}

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

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    currentView,
    hasStudentProfile,
    hasInstructorProfile,
    isDualRole,
    instructorRole,
    signOut,
    switchView,
  } = useAuth();
  const { t } = useLanguage();

  // Determine if user is viewing as instructor
  const isInstructor = currentView === 'instructor' && hasInstructorProfile;

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

  const getRoleBadge = () => {
    if (currentView === 'instructor') {
      if (instructorRole === 'admin') {
        return {
          text: t('navigation.administrator'),
          className: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      }
      return {
        text: t('navigation.instructor'),
        className: 'bg-emerald-50 text-[#10b981] border-emerald-200'
      };
    }
    return {
      text: t('navigation.student'),
      className: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleSwitchView = async (view: 'student' | 'instructor') => {
    try {
      await switchView(view);
      setDropdownOpen(false);
    } catch (error) {
      console.error('Error switching view:', error);
    }
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
                className="flex items-center hover:opacity-80 transition-opacity"
                aria-label="Home - idir.ai"
              >
                <Image
                  src="/logo-idirai-dark.png"
                  alt="idir.ai"
                  width={130}
                  height={64}
                  priority
                  className="h-6 md:h-8 w-auto"
                />
              </Link>
            </div>

            {/* Desktop Navigation - Profile Dropdown */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />

              {/* View Switcher for Dual-Role Users */}
              {isDualRole && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <button
                    onClick={() => handleSwitchView('student')}
                    className={`px-4 py-2.5 rounded-md text-sm font-bold uppercase tracking-wide transition-all min-h-[44px] ${
                      currentView === 'student'
                        ? 'bg-[#10b981] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {t('navigation.student')}
                  </button>
                  <button
                    onClick={() => handleSwitchView('instructor')}
                    className={`px-4 py-2.5 rounded-md text-sm font-bold uppercase tracking-wide transition-all min-h-[44px] ${
                      currentView === 'instructor'
                        ? 'bg-[#10b981] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {t('navigation.instructor')}
                  </button>
                </div>
              )}

              {user ? (
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

                    {/* Name and Role */}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-gray-900">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className={`text-sm px-2.5 py-1 rounded-md border font-semibold ${getRoleBadge().className}`}>
                        {getRoleBadge().text}
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
                        {/* Navigation Items based on current view */}
                        {isInstructor ? (
                          <>
                            <Link
                              href="/instructor/dashboard"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              {t('navigation.dashboard')}
                            </Link>
                            {instructorRole === 'admin' && (
                              <Link
                                href="/instructor/dashboard/manage-instructors"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {t('navigation.manageInstructors')}
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
                              {t('navigation.updateMyProfile')}
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              href="/dashboard"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              {t('navigation.myCourses')}
                            </Link>
                            <Link
                              href="/dashboard/profile"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {t('navigation.myProfile')}
                            </Link>
                          </>
                        )}

                        <div className="border-t border-gray-200 my-2"></div>

                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          {t('navigation.logOut')}
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
            <Link
              href={isInstructor ? '/instructor/dashboard' : user ? '/dashboard' : '/'}
              onClick={() => setIsOpen(false)}
              className="flex items-center"
            >
              <Image
                src="/logo-idirai-dark.png"
                alt="idir.ai"
                width={100}
                height={49}
                className="h-6 w-auto"
              />
            </Link>
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
            {user && (
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
                    <span className={`inline-block text-sm px-2.5 py-1 rounded-md border font-semibold ${getRoleBadge().className}`}>
                      {getRoleBadge().text}
                    </span>
                  </div>
                </div>

                {/* View Switcher for Dual-Role Users - Mobile */}
                {isDualRole && (
                  <div className="mt-3 px-3">
                    <p className="text-sm text-gray-600 uppercase tracking-wide mb-2 font-bold">{t('navigation.switchView')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleSwitchView('student');
                          setIsOpen(false);
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all min-h-[44px] ${
                          currentView === 'student'
                            ? 'bg-[#10b981] text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t('navigation.student')}
                      </button>
                      <button
                        onClick={() => {
                          handleSwitchView('instructor');
                          setIsOpen(false);
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all min-h-[44px] ${
                          currentView === 'instructor'
                            ? 'bg-[#10b981] text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t('navigation.instructor')}
                      </button>
                    </div>
                  </div>
                )}
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
                  {instructorRole === 'admin' && (
                    <Link
                      href="/instructor/dashboard/manage-instructors"
                      className={`block px-4 py-3 text-sm font-bold transition-all uppercase tracking-wide rounded-lg ${
                        pathname === '/instructor/dashboard/manage-instructors'
                          ? 'text-[#10b981] bg-emerald-50 border-l-2 border-[#10b981]'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {t('navigation.manageInstructors')}
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      handleSignOut();
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
                      handleSignOut();
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

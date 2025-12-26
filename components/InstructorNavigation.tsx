'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import Cookies from 'js-cookie';
import { verifyInstructorAction } from '@/lib/instructor-auth-actions';
import { Instructor } from '@/types/database';
import { isAdmin } from '@/lib/roles';

export default function InstructorNavigation() {
  const [instructorData, setInstructorData] = useState<Instructor | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  // Fetch instructor data
  useEffect(() => {
    const fetchInstructorData = async () => {
      const instructorId = Cookies.get('instructorId');
      const userType = Cookies.get('userType');

      if (!instructorId || userType !== 'instructor') {
        router.push('/instructor/login');
        return;
      }

      try {
        const result = await verifyInstructorAction(instructorId);
        if (result.success && result.data) {
          setInstructorData(result.data);
        } else {
          Cookies.remove('instructorId');
          Cookies.remove('userType');
          router.push('/instructor/login');
        }
      } catch (error) {
        console.error('Error fetching instructor data:', error);
        router.push('/instructor/login');
      } finally {
        setLoading(false);
      }
    };

    fetchInstructorData();
  }, [router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    Cookies.remove('instructorId');
    Cookies.remove('userType');
    router.push('/instructor/login');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadge = (instructor: Instructor) => {
    if (isAdmin(instructor)) {
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

  if (loading || !instructorData) {
    return (
      <nav className="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-xl border-b border-gray-200 bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/instructor/dashboard"
              className="text-xl md:text-2xl font-black text-gray-900 hover:text-[#10b981] transition-colors uppercase tracking-tight"
            >
              IO
            </Link>
            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  const roleBadge = getRoleBadge(instructorData);

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-xl border-b border-gray-200 bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/instructor/dashboard"
            className="text-xl md:text-2xl font-black text-gray-900 hover:text-[#10b981] transition-colors uppercase tracking-tight"
          >
            IO
          </Link>

          {/* Right side - Language Switcher + Profile Dropdown */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all group"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {/* Profile Picture or Initials */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-50 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                  {instructorData.picture_url ? (
                    <img
                      src={instructorData.picture_url}
                      alt={`${instructorData.first_name} ${instructorData.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[#10b981]">
                      {getInitials(instructorData.first_name, instructorData.last_name)}
                    </span>
                  )}
                </div>

                {/* Name and Role (hidden on mobile) */}
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-bold text-gray-900">
                    {instructorData.first_name} {instructorData.last_name}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${roleBadge.className}`}>
                    {roleBadge.text}
                  </span>
                </div>

                {/* Dropdown Arrow */}
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden animate-fade-in">
                  {/* Mobile: Show name and role */}
                  <div className="md:hidden px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <p className="text-sm font-bold text-gray-900">
                      {instructorData.first_name} {instructorData.last_name}
                    </p>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border mt-1 ${roleBadge.className}`}>
                      {roleBadge.text}
                    </span>
                  </div>

                  {/* Dropdown Items */}
                  <div className="py-2">
                    <Link
                      href="/instructor/dashboard/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#10b981] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Update My Profile
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

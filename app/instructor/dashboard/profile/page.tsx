'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInstructorAuth } from '@/hooks/useInstructorAuth';
import { updateInstructorProfileAction, updateInstructorPasswordAction } from '@/lib/instructor-auth-actions';
import { validatePassword } from '@/lib/passwordValidation';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import imageCompression from 'browser-image-compression';
import { useInstructorPermissions } from '@/hooks/useInstructorPermissions';

const COUNTRIES = {
  US: { en: 'United States', es: 'Estados Unidos' },
  ES: { en: 'Spain', es: 'España' },
  MX: { en: 'Mexico', es: 'México' },
  AR: { en: 'Argentina', es: 'Argentina' },
  CO: { en: 'Colombia', es: 'Colombia' },
  PE: { en: 'Peru', es: 'Perú' },
  CL: { en: 'Chile', es: 'Chile' },
  EC: { en: 'Ecuador', es: 'Ecuador' },
  VE: { en: 'Venezuela', es: 'Venezuela' },
  BR: { en: 'Brazil', es: 'Brasil' },
  FR: { en: 'France', es: 'Francia' },
  DE: { en: 'Germany', es: 'Alemania' },
  GB: { en: 'United Kingdom', es: 'Reino Unido' },
  IT: { en: 'Italy', es: 'Italia' },
  CA: { en: 'Canada', es: 'Canadá' },
};

export default function InstructorProfilePage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { instructor, loading: authLoading, csrfToken, refreshInstructor } = useInstructorAuth();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'es'>('en');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Profile picture state
  const [pictureUrl, setPictureUrl] = useState('');
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState('');
  const [pictureUploading, setPictureUploading] = useState(false);
  const [pictureCompressing, setPictureCompressing] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!authLoading && !instructor) {
      router.push('/instructor/login');
    }
  }, [instructor, authLoading, router]);

  // Populate form when instructor data loads
  useEffect(() => {
    if (instructor) {
      console.log('[Profile Page] Instructor data:', {
        hasProfile: !!instructor.profile,
        birth_date: instructor.profile?.birth_date,
        fullProfile: instructor.profile,
      });

      setFirstName(instructor.first_name);
      setLastName(instructor.last_name);
      setEmail(instructor.email);
      // Format date properly for input type="date" (YYYY-MM-DD)
      let birthDate = '';
      if (instructor.profile?.birth_date) {
        // Convert Date object or string to YYYY-MM-DD format
        const dateObj = typeof instructor.profile.birth_date === 'string'
          ? new Date(instructor.profile.birth_date)
          : instructor.profile.birth_date;
        birthDate = dateObj.toISOString().split('T')[0];
      }
      console.log('[Profile Page] Setting birth_date to:', birthDate);
      setDateOfBirth(birthDate);
      setCountry(instructor.country || '');
      setDescription(instructor.profile?.description || '');
      setPreferredLanguage(instructor.profile?.preferred_language || 'en');
      setLinkedinUrl(instructor.profile?.linkedin_url || '');
      setWebsiteUrl(instructor.profile?.website_url || '');
      setXUrl(instructor.profile?.x_url || '');
      setYoutubeUrl(instructor.profile?.youtube_url || '');
      setPictureUrl(instructor.profile?.picture_url || '');
    }
  }, [instructor]);

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileError('');
    setPictureCompressing(false);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setProfileError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        setProfileError('Image size should be less than 5MB');
        return;
      }

      let processedFile = file;

      // Compress if larger than 1MB
      if (file.size > 1 * 1024 * 1024) {
        setPictureCompressing(true);
        console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type,
        };

        try {
          processedFile = await imageCompression(file, options);
          console.log(`Compressed file size: ${(processedFile.size / 1024 / 1024).toFixed(2)} MB`);
        } catch (compressionError) {
          console.error('Compression error:', compressionError);
          // Continue with original file if compression fails
        }

        setPictureCompressing(false);
      }

      setPictureFile(processedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result as string);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      setProfileError('Failed to process image');
      setPictureCompressing(false);
    }
  };

  const handlePictureUpload = async () => {
    if (!pictureFile || !instructor || !csrfToken) return;

    setPictureUploading(true);
    setProfileError('');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', pictureFile);
      formData.append('instructorId', instructor.id);

      // Upload to API route with CSRF token
      const response = await fetch('/api/upload-profile-picture', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Update local state
      setPictureUrl(data.url);
      setPicturePreview('');
      setPictureFile(null);
      setProfileSuccess(true);

      // Refresh instructor data from server
      await refreshInstructor();

      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);
    } catch (error: any) {
      setProfileError(error.message || 'Failed to upload image');
    } finally {
      setPictureUploading(false);
    }
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!firstName || !lastName || !email || !dateOfBirth || !country) {
      setProfileError('Required fields are missing');
      return;
    }

    setProfileLoading(true);

    try {
      const result = await updateInstructorProfileAction(
        instructor!.id,
        firstName,
        lastName,
        email,
        dateOfBirth,
        country,
        description,
        preferredLanguage,
        linkedinUrl,
        websiteUrl,
        xUrl,
        youtubeUrl
      );

      if (!result.success) {
        setProfileError(result.error || 'Failed to update profile');
        setProfileLoading(false);
        return;
      }

      setProfileSuccess(true);
      await refreshInstructor();

      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);

      setProfileLoading(false);
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred');
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setPasswordError(t('signup.passwordError'));
      return;
    }

    setPasswordLoading(true);

    try {
      const result = await updateInstructorPasswordAction(instructor!.id, currentPassword, newPassword);

      if (!result.success) {
        setPasswordError(result.error || 'Failed to update password');
        setPasswordLoading(false);
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setPasswordSuccess(false);
      }, 3000);

      setPasswordLoading(false);
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred');
      setPasswordLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!instructor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Page Title */}
        <div className="mb-6 md:mb-8 animate-fade-in-up">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {t('profile.title')}
          </h1>
        </div>

        {/* Profile Picture Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 mb-6 animate-fade-in shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Profile Picture</h2>
            <p className="text-sm text-gray-600">Upload or change your profile picture</p>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Current/Preview Picture */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                {picturePreview ? (
                  <img
                    src={picturePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : pictureUrl ? (
                  <img
                    src={pictureUrl}
                    alt={`${instructor?.first_name} ${instructor?.last_name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                    <svg className="w-16 h-16 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-picture" className="block text-sm font-bold text-gray-700 mb-2">
                    {picturePreview ? 'Selected Image' : 'Choose New Picture'}
                  </label>
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="block w-full text-sm text-gray-900 border border-gray-200 rounded-lg cursor-pointer bg-gray-100 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-[#10b981] file:text-white hover:file:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={pictureUploading || pictureCompressing}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB. Images over 1MB will be automatically compressed.
                  </p>
                  {pictureCompressing && (
                    <p className="mt-2 text-xs text-[#10b981] font-semibold flex items-center">
                      <svg className="animate-spin h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Compressing image...
                    </p>
                  )}
                </div>

                {picturePreview && !pictureCompressing && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handlePictureUpload}
                      disabled={pictureUploading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                    >
                      {pictureUploading ? 'Uploading...' : 'Upload Picture'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPicturePreview('');
                        setPictureFile(null);
                        setPictureCompressing(false);
                      }}
                      disabled={pictureUploading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-bold rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 mb-6 animate-fade-in shadow-sm">
            <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('profile.personalInfo')}</h2>
            <p className="text-sm text-gray-600">{t('profile.personalInfoDescription')}</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileError && (
              <div className="rounded-md bg-red-50 border border-red-500 p-4">
                <p className="text-sm text-red-600">{profileError}</p>
              </div>
            )}

            {profileSuccess && (
              <div className="rounded-md bg-emerald-50 border border-[#10b981] p-4">
                <p className="text-sm text-[#10b981] font-semibold">{t('profile.profileUpdated')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('profile.profileUpdatedMessage')}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('profile.firstName')}
                </label>
                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="last-name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('profile.lastName')}
                </label>
                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-address" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.email')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date-of-birth" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('profile.dateOfBirth')}
                </label>

                <input
                  id="date-of-birth"
                  name="dateOfBirth"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  {t('profile.country')}
                </label>
                <select
                  id="country"
                  name="country"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">{t('profile.selectCountry')}</option>
                  {Object.entries(COUNTRIES).map(([code, names]) => (
                    <option key={code} value={code}>
                      {names[language as 'en' | 'es']}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="preferred-language" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.preferredLanguage')}
              </label>
              <select
                id="preferred-language"
                name="preferredLanguage"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'es')}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.description')}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent resize-none"
                placeholder={t('profile.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full md:w-auto px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? t('profile.savingChanges') : t('profile.saveChanges')}
              </button>
            </div>
          </form>
        </div>

        {/* Social Media & Links Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 mb-6 animate-fade-in shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('profile.socialLinks')}</h2>
            <p className="text-sm text-gray-600">{t('profile.socialLinksDescription')}</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="linkedin-url" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.linkedinUrl')}
              </label>
              <input
                id="linkedin-url"
                name="linkedinUrl"
                type="url"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder={t('profile.linkedinPlaceholder')}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="website-url" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.websiteUrl')}
              </label>
              <input
                id="website-url"
                name="websiteUrl"
                type="url"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder={t('profile.websitePlaceholder')}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="x-url" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.xUrl')}
              </label>
              <input
                id="x-url"
                name="xUrl"
                type="url"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder={t('profile.xPlaceholder')}
                value={xUrl}
                onChange={(e) => setXUrl(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="youtube-url" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.youtubeUrl')}
              </label>
              <input
                id="youtube-url"
                name="youtubeUrl"
                type="url"
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                placeholder={t('profile.youtubePlaceholder')}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full md:w-auto px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? t('profile.savingChanges') : t('profile.saveChanges')}
              </button>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg border border-gray-200 emerald-accent-left p-6 animate-fade-in shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('profile.security')}</h2>
            <p className="text-sm text-gray-600">{t('profile.securityDescription')}</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-red-50 border border-red-500 p-4">
                <p className="text-sm text-red-600">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="rounded-md bg-emerald-50 border border-[#10b981] p-4">
                <p className="text-sm text-[#10b981] font-semibold">{t('profile.passwordUpdated')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('profile.passwordUpdatedMessage')}</p>
              </div>
            )}

            <div>
              <label htmlFor="current-password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.currentPassword')}
              </label>
              <input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.newPassword')}
              </label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                {t('profile.confirmPassword')}
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-200 bg-gray-100 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full md:w-auto px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-[#10b981] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? t('profile.changingPassword') : t('profile.changePassword')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
